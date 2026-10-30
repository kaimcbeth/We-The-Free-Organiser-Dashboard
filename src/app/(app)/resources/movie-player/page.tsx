import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { MovieResults } from "./movie-results";

export default async function MoviePlayerPage() {
  const { organiser } = await requireOrganiser();
  const teamId =
    organiser.allCommunities || organiser.exampleMode
      ? null
      : organiser.team_id;
  return (
    <>
      <Link
        href="/resources"
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        ← Resources &amp; Training
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Movie player
      </h1>
      <p className="mt-1 text-stone-600">
        A full-screen player for Movie Challenge laptops that works with no
        internet. After each film, viewers rate how much it impacted them (0 to
        10). With the laptops online (a phone hotspot is fine), you can watch
        the count here live.
      </p>

      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        {teamId ? (
          <a
            href="/resources/movie-player/download"
            className="inline-block rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-2"
          >
            Download the player
          </a>
        ) : (
          <p className="text-sm text-stone-600">
            Pick a single community at the top to download its player.
          </p>
        )}
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-stone-700">
          <li>
            Download the Movie Challenge videos from the{" "}
            <a
              href="https://drive.google.com/drive/folders/1gzYY00Al3T6AOfjW2D5owmyibkqX-3LZ?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-pink-ink underline"
            >
              videos folder on Google Drive
            </a>
            . Put them and the player in the same folder on each laptop (or a
            USB stick). MP4 videos play on Windows and Mac.
          </li>
          <li>
            Open the player (double-click it), click <b>Choose films</b> and
            select the videos. Each laptop remembers them after that.
          </li>
          <li>
            For an A/B test, name the files like <i>Standard A.mp4</i> and{" "}
            <i>Standard B.mp4</i>: they go in one &ldquo;Standard&rdquo; tile,
            which plays one of them at random. Rename or reorder tiles with{" "}
            <b>Edit menu</b>.
          </li>
          <li>
            Answers are saved on the laptop and sent here whenever it&apos;s
            online with the player open. Offline all day? Open the player at
            home on wifi and they&apos;ll come through. <b>Results</b> on the
            player also saves them as a spreadsheet.
          </li>
        </ol>
        <p className="mt-3 text-xs text-stone-500">
          Use the same browser on each laptop every time, and don&apos;t clear
          its browsing data before the answers are sent.
        </p>
      </section>

      {teamId && <MovieResults teamId={teamId} tz={organiser.team.timezone} />}
    </>
  );
}
