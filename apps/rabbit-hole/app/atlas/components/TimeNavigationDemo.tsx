/**
 * Time Navigation Demo
 *
 * Demonstrates the integrated timeline chart with time slice data
 */

"use client";

import React, { useState } from "react";

import { TimeWindow, getTimePresets } from "@protolabsai/utils/atlas";

import { TimeSliceInfoPanel } from "./TimeSliceInfoPanel";

export function TimeNavigationDemo() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>({
    from: "2024-01-01",
    to: "2024-12-31",
  });

  const [entityUid, setEntityUid] = useState<string>("person:joe_rogan");

  const presets = getTimePresets();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Time Navigation Demo
        </h1>
        <p className="text-gray-600 mt-2">
          Interactive timeline visualization with brush selection and time slice
          data
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Focus
            </label>
            <select
              value={entityUid}
              onChange={(e) => setEntityUid(e.target.value)}
              className="w-full rounded border-gray-300 text-sm"
            >
              <option value="">All Entities</option>
              <option value="person:joe_rogan">Joe Rogan</option>
              <option value="person:trump">Donald Trump</option>
              <option value="org:spotify">Spotify</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={timeWindow.from}
              onChange={(e) =>
                setTimeWindow((prev) => ({ ...prev, from: e.target.value }))
              }
              className="w-full rounded border-gray-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={timeWindow.to}
              onChange={(e) =>
                setTimeWindow((prev) => ({ ...prev, to: e.target.value }))
              }
              className="w-full rounded border-gray-300 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Ranges
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.slice(0, 8).map((preset) => (
              <button
                key={preset.label}
                onClick={() => setTimeWindow(preset.timeWindow)}
                className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time Slice Panel with Timeline Chart */}
      <TimeSliceInfoPanel
        timeWindow={timeWindow}
        entityUid={entityUid || undefined}
        onTimeWindowChange={setTimeWindow}
        className="border-0 shadow-lg"
      />
    </div>
  );
}
