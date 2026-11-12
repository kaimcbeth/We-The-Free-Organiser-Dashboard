#!/bin/bash
# Movement Hub ↔ Beeper helper installer (Organiser chats), for macOS.
#   Install:   curl -fsSL https://wtf-movement-hub.vercel.app/beeper/install.sh | bash -s <link code>
#   Remove:    curl -fsSL https://wtf-movement-hub.vercel.app/beeper/install.sh | bash -s uninstall
# The link code comes from the Hub (Actions → Organiser chats → Set up).
set -e

HUB="https://wtf-movement-hub.vercel.app"
SUPABASE_URL="https://jmslxbygvmjtwwxuzkrt.supabase.co"
SUPABASE_KEY="sb_publishable_YJ9cKsYHmEsisU0Grzxmkg_o-ESwfVS" # public key, safe to share
DIR="$HOME/Library/Application Support/WTF Hub"
LABEL="wtf.activism.hub-relay"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ "$(uname)" != "Darwin" ]; then
  echo "This helper is for Macs only."; exit 1
fi

if [ "$1" = "uninstall" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  rm -rf "$DIR"
  security delete-generic-password -s "WTF Hub Beeper" >/dev/null 2>&1 || true
  echo "Removed. To forget your chats in the Hub too, press Disconnect on the Organiser chats page."
  exit 0
fi

LINK="$1"
if ! [[ "$LINK" =~ ^[0-9a-f]{48}$ ]]; then
  echo "Copy the whole line from the Hub (it ends with your link code)."; exit 1
fi

mkdir -p "$DIR" "$HOME/Library/LaunchAgents"
chmod 700 "$DIR"
curl -fsSL "$HUB/beeper/relay.js" -o "$DIR/relay.js"
umask 077
printf '{"supabaseUrl":"%s","key":"%s","link":"%s"}\n' "$SUPABASE_URL" "$SUPABASE_KEY" "$LINK" > "$DIR/config.json"

# The Beeper token, asked for in a pop-up and kept in this Mac's Keychain.
if ! security find-generic-password -s "WTF Hub Beeper" -w >/dev/null 2>&1; then
  TOKEN=$(osascript -e 'text returned of (display dialog "Paste your Beeper token.\n\nIn Beeper: Settings → Developers → Approved connections → + (turn on \"Allow sensitive actions\" so replies can be sent)." default answer "" with hidden answer with title "Movement Hub" buttons {"Cancel", "Save"} default button "Save")' 2>/dev/null || true)
  if [ -z "$TOKEN" ]; then
    echo "No Beeper token entered. Run the same line again when you have it."; exit 1
  fi
  security add-generic-password -U -s "WTF Hub Beeper" -a beeper -w "$TOKEN"
fi

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/osascript</string>
    <string>-l</string>
    <string>JavaScript</string>
    <string>$DIR/relay.js</string>
  </array>
  <key>StartInterval</key><integer>30</integer>
  <key>RunAtLoad</key><true/>
  <key>ProcessType</key><string>Background</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

sleep 4
echo ""
echo "Installed. First run: $(cat "$DIR/last-run.txt" 2>/dev/null || echo 'starting…')"
echo "Go back to the Hub: your chats appear within a minute."
