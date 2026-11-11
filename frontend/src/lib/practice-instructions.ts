/**
 * The instructions screen of a practice test, written in the admin.
 *
 * Each test can carry its own heading, a list of instructions (a bold lead-in and the text after it) and a note under
 * the Start button. A test with none of them shows the standard instructions below, so a new test still has a page.
 * In an instruction's text, `{marking}` stands for the test's marking scheme, which the site works out from the
 * questions so it can never disagree with the paper.
 */

export type Instruction = { title: string; text: string };

export const DEFAULT_INSTRUCTIONS_TITLE = "Before you begin";

/** The instructions every test shows until the editor writes its own. They are also what "Use the standard instructions" fills in. */
export function defaultInstructions(sectionLock: boolean): Instruction[] {
  return [
    { title: "Marking.", text: "{marking}." },
    sectionLock
      ? {
          title: "Sections are locked.",
          text: "Each section runs on its own clock, and once its time is up it closes for good — you cannot go back to it. This is how the real paper behaves.",
        }
      : {
          title: "Sections are open.",
          text: "You can move between them freely for as long as the overall clock is running.",
        },
    {
      title: "Mark for Review & Next does not save your answer.",
      text: "To record an answer and flag it to come back to, use Save & Mark for Review. A question marked without a saved answer scores nothing — exactly as in the real exam.",
    },
    {
      title: "Your progress is kept.",
      text: "Refreshing or accidentally closing the tab will not lose the sitting — reopen it and the paper resumes where you left off, with the clock where it should be.",
    },
    {
      title: "The palette.",
      text: "Numbers down the side are colour- and shape-coded: green answered, red seen but unanswered, violet marked for review. A violet tile with a tick has an answer saved and will be marked.",
    },
  ];
}

export const DEFAULT_START_NOTE = "The clock starts as soon as you open the paper.";

type Authored = { instructionsTitle?: string; instructions?: Instruction[]; startNote?: string; sectionLock: boolean; totalMinutes: number };

/** What the instructions page shows for a test: its own words where it has them, the standard ones where not. */
export function resolveInstructions(test: Authored): { title: string; items: Instruction[]; note: string } {
  const own = (test.instructions ?? []).filter((i) => i.title.trim() || i.text.trim());
  return {
    title: test.instructionsTitle?.trim() || DEFAULT_INSTRUCTIONS_TITLE,
    items: own.length > 0 ? own : defaultInstructions(test.sectionLock),
    // The standard note belongs to a timed test only. An editor's own note is always shown.
    note: test.startNote?.trim() || (test.totalMinutes > 0 ? DEFAULT_START_NOTE : ""),
  };
}

/** Puts the live marking scheme where an instruction says `{marking}`. */
export function withMarking(text: string, marking: string): string {
  return text.replaceAll("{marking}", marking);
}
