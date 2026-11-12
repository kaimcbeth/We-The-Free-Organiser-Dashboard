// Movement Hub ↔ Beeper helper (Organiser chats). Runs on the Mac where
// Beeper Desktop is open, every 30 seconds via a LaunchAgent, with macOS's
// own JavaScript (osascript -l JavaScript) and curl: nothing to install.
//
// Each run: reads Beeper's chat list, sends it to the Hub, fetches recent
// messages for chats marked as organiser chats, and sends replies written
// in the Hub. The Beeper token stays in this Mac's Keychain; the Hub only
// gets chat titles (and messages for organiser chats).
//
// Installed by /beeper/install.sh. Remove with:
//   curl -fsSL https://wtf-movement-hub.vercel.app/beeper/install.sh | bash -s uninstall

ObjC.import("Foundation");
var VERSION = "2026-11-13a";
var app = Application.currentApplication();
app.includeStandardAdditions = true;

var HOME = $.NSHomeDirectory().js;
var DIR = HOME + "/Library/Application Support/WTF Hub";
var BEEPER = "http://127.0.0.1:23373";

function sh(cmd) {
  return app.doShellScript(cmd, { alteringLineEndings: false });
}
function q(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}
function readFile(path) {
  var s = $.NSString.stringWithContentsOfFileEncodingError(
    path,
    $.NSUTF8StringEncoding,
    null,
  );
  return s.isNil() ? null : s.js;
}
function writeFile(path, text) {
  $.NSString.alloc
    .initWithUTF8String(text)
    .writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null);
  sh("chmod 600 " + q(path));
}

// One HTTP request through curl. Headers and body go through files so the
// tokens never appear in the process list.
function http(method, url, headers, body) {
  var hfile = DIR + "/.h";
  var bfile = DIR + "/.b";
  writeFile(hfile, headers.join("\n") + "\n");
  var cmd =
    "curl -sS -m 25 -X " + method + " -H @" + q(hfile) + " -w '\\n%{http_code}' ";
  if (body !== undefined) {
    writeFile(bfile, JSON.stringify(body));
    cmd += "--data-binary @" + q(bfile) + " ";
  }
  cmd += q(url);
  var out;
  try {
    out = sh(cmd + " 2>&1");
  } catch (e) {
    return { status: 0, text: String(e.message || e) };
  } finally {
    try {
      sh("rm -f " + q(hfile) + " " + q(bfile));
    } catch (e) {}
  }
  var i = out.lastIndexOf("\n");
  return { status: Number(out.slice(i + 1)) || 0, text: out.slice(0, i) };
}

function main() {
  var config = JSON.parse(readFile(DIR + "/config.json") || "{}");
  if (!config.link) return "No config: run the installer again.";
  var hub = function (fn, args) {
    var r = http(
      "POST",
      config.supabaseUrl + "/rest/v1/rpc/" + fn,
      ["apikey: " + config.key, "Content-Type: application/json"],
      args,
    );
    if (r.status < 200 || r.status >= 300)
      throw new Error("Hub " + r.status + ": " + r.text.slice(0, 200));
    return r.text ? JSON.parse(r.text) : null;
  };

  var token = "";
  try {
    token = sh("security find-generic-password -s 'WTF Hub Beeper' -w").trim();
  } catch (e) {}
  if (!token) {
    hub("beeper_status", {
      p_token: config.link,
      p_ok: false,
      p_error: "No Beeper token saved on this Mac. Run the installer again.",
    });
    return "no token";
  }
  var auth = ["Authorization: Bearer " + token, "Content-Type: application/json"];
  var beeper = function (method, path, body) {
    var r = http(method, BEEPER + path, auth, body);
    if (r.status === 0) throw new Error("Beeper isn't open (or its API is off).");
    if (r.status === 401 || r.status === 403)
      throw new Error("Beeper said the token isn't allowed (" + r.status + ").");
    if (r.status < 200 || r.status >= 300)
      throw new Error("Beeper " + r.status + ": " + r.text.slice(0, 200));
    return r.text ? JSON.parse(r.text) : null;
  };

  var chats;
  try {
    var list = beeper("GET", "/v1/chats?limit=100");
    chats = (list.items || [])
      .filter(function (c) {
        return !c.merge; // merged chats hold no messages; their members are listed too
      })
      .map(function (c) {
        var p = c.preview;
        return {
          id: c.id,
          accountID: c.accountID,
          network: c.network,
          title: c.title,
          type: c.type,
          lastActivity: c.lastActivity || null,
          unreadCount: c.unreadCount || 0,
          preview: p
            ? {
                text: p.text || (p.attachments && p.attachments.length ? "📎 Attachment" : ""),
                isSender: !!p.isSender,
                timestamp: p.timestamp,
              }
            : null,
        };
      });
  } catch (e) {
    hub("beeper_status", { p_token: config.link, p_ok: false, p_error: String(e.message) });
    return String(e.message);
  }
  hub("beeper_status", { p_token: config.link, p_ok: true, p_error: null });

  var fetched = {};
  var pending = { p_chats: chats, p_messages: [], p_sent: [] };
  for (var round = 0; round < 4; round++) {
    pending.p_token = config.link;
    pending.p_version = VERSION;
    var res = hub("beeper_sync", pending);
    pending = { p_chats: [], p_messages: [], p_sent: [] };

    (res.outbox || []).forEach(function (o) {
      try {
        beeper("POST", "/v1/chats/" + encodeURIComponent(o.chat) + "/messages", {
          text: o.body,
        });
        pending.p_sent.push({ id: o.id, ok: true });
      } catch (e) {
        pending.p_sent.push({ id: o.id, ok: false, error: String(e.message) });
      }
    });

    (res.want || []).forEach(function (chatID) {
      if (fetched[chatID]) return;
      fetched[chatID] = true;
      try {
        var page = beeper("GET", "/v1/chats/" + encodeURIComponent(chatID) + "/messages");
        (page.items || [])
          .filter(function (m) {
            return !m.isHidden && !m.isDeleted;
          })
          .sort(function (a, b) {
            return a.timestamp < b.timestamp ? 1 : -1;
          })
          .slice(0, 30)
          .forEach(function (m) {
            pending.p_messages.push({
              chatID: chatID,
              id: m.id,
              senderName: m.senderName || null,
              isSender: !!m.isSender,
              text: m.text || null,
              hasAttachment: !!(m.attachments && m.attachments.length),
              timestamp: m.timestamp,
            });
          });
      } catch (e) {}
    });

    if (!pending.p_sent.length && !pending.p_messages.length) break;
  }
  return "ok";
}

function run() {
  var result;
  try {
    result = main();
  } catch (e) {
    result = "error: " + (e.message || e);
  }
  try {
    writeFile(DIR + "/last-run.txt", new Date().toISOString() + " " + result + "\n");
  } catch (e) {}
  return result;
}
