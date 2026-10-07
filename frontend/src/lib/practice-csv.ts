/**
 * Importing practice questions from a spreadsheet saved as CSV.
 *
 * One row is one question. The columns, in any order and in any letter case:
 *
 *   section        the section it belongs to (rows with the same name are grouped)
 *   type           mcq-single, mcq-multi or tita. Left blank, it is worked out from the answer
 *   topic          for the topic analysis in the results
 *   difficulty     easy, medium or hard (default medium)
 *   question       the question text
 *   passage        a passage shared by several questions: the same text makes one passage
 *   option_a ... option_f   the options of a multiple-choice question
 *   correct        a letter (B), several letters (A;C), or the number for a type-in answer
 *   tolerance      how far a type-in answer may be off (default 0)
 *   marks          default 1
 *   negative_marks marks lost on a wrong answer (default 0)
 *   expected_seconds   default 120
 *   solution       the worked solution shown in the results
 *
 * Nothing is saved by importing: the questions land in the editor, where they can be
 * checked and changed, and are stored when the test is saved.
 */

import type { AdminPracticeQuestion, AdminPracticeSection } from "@/lib/api";

const OPTION_COLUMNS = ["option_a", "option_b", "option_c", "option_d", "option_e", "option_f"];

export const CSV_TEMPLATE = [
  "section,type,topic,difficulty,question,passage,option_a,option_b,option_c,option_d,option_e,option_f,correct,tolerance,marks,negative_marks,expected_seconds,solution",
  'Quant,mcq-single,Arithmetic,easy,"A train covers 120 km in 2 hours. What is its speed?",,40 km/h,60 km/h,80 km/h,100 km/h,,,B,,3,1,60,Speed = distance / time = 120 / 2 = 60 km/h.',
  'Quant,mcq-multi,Number systems,medium,"Which of these are prime numbers?",,2,9,11,15,,,A;C,,3,1,90,2 and 11 have no divisors other than 1 and themselves.',
  'Quant,tita,Algebra,medium,"If 3x + 5 = 20, what is x?",,,,,,,,5,0,3,0,75,3x = 15 so x = 5.',
].join("\r\n");

/** Splits CSV text into rows of cells. Handles quoted cells, doubled quotes and line breaks inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const toNumber = (text: string, fallback: number) => {
  const n = Number(text.trim());
  return text.trim() !== "" && Number.isFinite(n) ? n : fallback;
};

export type CsvImport = { sections: AdminPracticeSection[]; problems: string[] };

/** Turns CSV text into sections of questions, and a list of what could not be read (by row). */
export function importQuestionsFromCsv(text: string, defaultSection = "Section 1"): CsvImport {
  const rows = parseCsv(text);
  if (rows.length < 2) return { sections: [], problems: ["The file has no question rows. Use the template: a header row, then one row per question."] };

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  if (col("question") < 0) return { sections: [], problems: ['There is no "question" column. Use the template for the column names.'] };

  const sections = new Map<string, AdminPracticeSection>();
  const problems: string[] = [];

  rows.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "").trim() : "");

    const stem = get("question");
    if (!stem) {
      problems.push(`Row ${line}: the question is empty, so it was skipped.`);
      return;
    }

    const options = OPTION_COLUMNS.map((name) => get(name));
    while (options.length > 0 && options[options.length - 1] === "") options.pop();
    const correctText = get("correct");

    let type = get("type").toLowerCase() as AdminPracticeQuestion["type"] | "";
    if (type !== "mcq-single" && type !== "mcq-multi" && type !== "tita") {
      if (options.length === 0) type = "tita";
      else type = /^[a-f](\s*[;,&]\s*[a-f])+$/i.test(correctText) ? "mcq-multi" : "mcq-single";
    }

    const question: AdminPracticeQuestion = {
      type,
      topic: get("topic"),
      difficulty: (["easy", "medium", "hard"] as const).find((d) => d === get("difficulty").toLowerCase()) ?? "medium",
      stem,
      passage: get("passage"),
      options: type === "tita" ? [] : options,
      correctOptions: [],
      answerValue: null,
      tolerance: toNumber(get("tolerance"), 0),
      marks: toNumber(get("marks"), 1),
      negativeMarks: toNumber(get("negative_marks"), 0),
      expectedSeconds: Math.round(toNumber(get("expected_seconds"), 120)),
      solution: get("solution"),
    };

    if (type === "tita") {
      const value = Number(correctText);
      if (correctText === "" || !Number.isFinite(value)) problems.push(`Row ${line}: a type-in question needs the correct number in "correct".`);
      else question.answerValue = value;
    } else {
      const letters = correctText.toLowerCase().split(/[\s;,&]+/).filter(Boolean);
      const indexes = letters.map((l) => "abcdef".indexOf(l));
      if (letters.length === 0 || indexes.some((i) => i < 0 || i >= options.length)) {
        problems.push(`Row ${line}: "correct" must name the correct option letters, such as B or A;C.`);
      } else question.correctOptions = [...new Set(indexes)].sort((a, b) => a - b);
      if (options.length < 2) problems.push(`Row ${line}: a multiple-choice question needs at least two options.`);
    }

    const label = get("section") || defaultSection;
    const section = sections.get(label) ?? { label, durationMinutes: null, questions: [] };
    section.questions.push(question);
    sections.set(label, section);
  });

  return { sections: [...sections.values()], problems };
}
