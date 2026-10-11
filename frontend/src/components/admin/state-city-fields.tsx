"use client";

import { useState } from "react";
import type { IndiaGeo } from "@/lib/api";

/*
  State and city as two dropdowns: pick a state, then one of its districts. Same idea as the
  location form on the homepage panel.

  A college's city is often not a district's name (Bengaluru is in the Bengaluru Urban district,
  and a hub such as Delhi NCR spans several), so the city list ends with "Other, type it" and a
  text box. Whatever is chosen or typed goes out as the ordinary `state` and `city` fields.

  Without the lists (the API could not give them) both fall back to plain text boxes, as before.
*/

const box = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const OTHER = "__other__";

export function StateCityFields({ geo }: { geo: IndiaGeo }) {
  const states = Object.keys(geo).sort();
  const [state, setState] = useState("");
  const [choice, setChoice] = useState(""); // a district, OTHER, or "" for none yet
  const [typed, setTyped] = useState("");

  if (states.length === 0) {
    return (
      <>
        <div>
          <label htmlFor="city" className="block text-xs font-semibold text-ink">City <span className="text-brand">*</span></label>
          <input id="city" name="city" required placeholder="Bengaluru" className={box} />
        </div>
        <div>
          <label htmlFor="state" className="block text-xs font-semibold text-ink">State <span className="text-brand">*</span></label>
          <input id="state" name="state" required placeholder="Karnataka" className={box} />
        </div>
      </>
    );
  }

  const districts = state ? (geo[state] ?? []) : [];
  const city = choice === OTHER ? typed.trim() : choice;

  return (
    <>
      <div>
        <label htmlFor="state-pick" className="block text-xs font-semibold text-ink">
          State <span className="text-brand">*</span>
        </label>
        <select
          id="state-pick"
          required
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            // The old state's district means nothing in the new one.
            setChoice("");
            setTyped("");
          }}
          className={box}
        >
          <option value="">Select a state</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="hidden" name="state" value={state} />
      </div>

      <div>
        <label htmlFor="city-pick" className="block text-xs font-semibold text-ink">
          City <span className="text-brand">*</span>
        </label>
        <select
          id="city-pick"
          required
          disabled={!state}
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className={`${box} disabled:opacity-60`}
        >
          <option value="">{state ? "Select a city or district" : "Select a state first"}</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          {state && <option value={OTHER}>Other: type the city</option>}
        </select>
        {choice === OTHER && (
          <input
            aria-label="City name"
            required
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="e.g. Bengaluru"
            maxLength={200}
            className={box}
          />
        )}
        <input type="hidden" name="city" value={city} />
      </div>
    </>
  );
}
