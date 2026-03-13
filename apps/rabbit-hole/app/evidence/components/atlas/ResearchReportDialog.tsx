/**
 * Research Report Dialog
 *
 * Displays comprehensive markdown-formatted research reports
 * analyzing missing temporal data and research priorities.
 */

"use client";

import React, { useState, useEffect } from "react";

interface ResearchReportDialogProps {
  isOpen: boolean;
  entityUid: string;
  entityName: string;
  onClose: () => void;
}

interface ResearchReportData {
  entityUid: string;
  entityName: string;
  markdownReport: string;
  metrics: {
    totalMissingDates: number;
    intrinsicMissing: number;
    temporalMissing: number;
    researchPriority: "high" | "medium" | "low";
  };
}

export function ResearchReportDialog({
  isOpen,
  entityUid,
  entityName,
  onClose,
}: ResearchReportDialogProps) {
  const [reportData, setReportData] = useState<ResearchReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load research report when dialog opens
  useEffect(() => {
    if (isOpen && entityUid) {
      loadResearchReport();
    }
  }, [isOpen, entityUid]);

  const loadResearchReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`📊 Loading research report for: ${entityName}`);

      const response = await fetch(`/api/research/report/${entityUid}`);

      if (!response.ok) {
        throw new Error(`Failed to load research report: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
        console.log(
          `✅ Research report loaded: ${result.data.metrics.totalMissingDates} missing dates identified`
        );
      } else {
        throw new Error(result.error || "Failed to generate research report");
      }
    } catch (err) {
      console.error("Research report error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load research report"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (reportData) {
      navigator.clipboard.writeText(reportData.markdownReport);
      // Could add toast notification here
      console.log("📋 Research report copied to clipboard");
    }
  };

  const handleDownloadReport = () => {
    if (reportData) {
      const blob = new Blob([reportData.markdownReport], {
        type: "text/markdown",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `research-report-${entityUid.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("📄 Research report downloaded");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">📊</div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Research Analysis
                </h2>
                <p className="text-sm text-slate-600">
                  Temporal data analysis for {entityName}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {reportData && (
                <>
                  <button
                    onClick={handleCopyReport}
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Copy report to clipboard"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={handleDownloadReport}
                    className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    title="Download report as markdown"
                  >
                    📄 Download
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 text-xl hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center"
                title="Close dialog"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-4">🔍</div>
                  <div className="text-lg font-medium text-slate-900 mb-2">
                    Analyzing temporal data...
                  </div>
                  <div className="text-sm text-slate-600">
                    Identifying missing dates and research priorities
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-4">❌</div>
                  <div className="text-lg font-medium text-red-900 mb-2">
                    Failed to generate research report
                  </div>
                  <div className="text-sm text-red-600 mb-4">{error}</div>
                  <button
                    onClick={loadResearchReport}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    🔄 Retry Analysis
                  </button>
                </div>
              </div>
            ) : reportData ? (
              <div className="p-6 overflow-y-auto">
                {/* Quick Metrics */}
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-slate-900">
                        {reportData.metrics.totalMissingDates}
                      </div>
                      <div className="text-xs text-slate-600">
                        Total Missing
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-700">
                        {reportData.metrics.intrinsicMissing}
                      </div>
                      <div className="text-xs text-slate-600">Entity Dates</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-700">
                        {reportData.metrics.temporalMissing}
                      </div>
                      <div className="text-xs text-slate-600">
                        Relationship Dates
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-2xl font-bold ${
                          reportData.metrics.researchPriority === "high"
                            ? "text-red-700"
                            : reportData.metrics.researchPriority === "medium"
                              ? "text-yellow-700"
                              : "text-green-700"
                        }`}
                      >
                        {reportData.metrics.researchPriority.toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-600">Priority</div>
                    </div>
                  </div>
                </div>

                {/* Markdown Report */}
                <div className="prose prose-slate max-w-none">
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto">
                    {reportData.markdownReport}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <div className="text-lg font-medium text-slate-900 mb-2">
                    Ready to analyze
                  </div>
                  <div className="text-sm text-slate-600">
                    Click analyze to generate research report for {entityName}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div>Enhanced Timeline Research System • Rabbit Hole Schema</div>
              {reportData && (
                <div>Report generated on {new Date().toLocaleDateString()}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
