import { useState, useEffect, useCallback } from "react";
import type { Project, Bead, BeadStatus, ExecutionState } from "./types";
import { projectApi, beadsApi, actionApi } from "./api";
import { ProjectList } from "./components/ProjectList";
import { BeadList } from "./components/BeadList";
import { OutputView } from "./components/OutputView";
import { ActionBar } from "./components/ActionBar";
import { TerminalEmbed } from "./components/TerminalEmbed";

type ActionType = "work" | "review" | "push-pr" | null;

function App(): JSX.Element {
  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Bead state
  const [beads, setBeads] = useState<Bead[]>([]);
  const [beadsLoading, setBeadsLoading] = useState(false);
  const [selectedBeadId, setSelectedBeadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BeadStatus | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentAction, setCurrentAction] = useState<ActionType>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [output, setOutput] = useState<string>("");
  const [outputState, setOutputState] = useState<ExecutionState | undefined>(undefined);

  // Terminal modal state
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const data = await projectApi.list();
        setProjects(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load projects";
        setProjectsError(message);
      } finally {
        setProjectsLoading(false);
      }
    };
    loadProjects();
  }, []);

  // Load beads when project is selected or filter changes
  useEffect(() => {
    if (!selectedProjectId) {
      setBeads([]);
      return;
    }

    const loadBeads = async () => {
      setBeadsLoading(true);
      try {
        const data = await beadsApi.list(selectedProjectId, statusFilter || undefined);
        setBeads(data);
      } catch (err) {
        // Silently handle bead loading errors
        setBeads([]);
      } finally {
        setBeadsLoading(false);
      }
    };
    loadBeads();
  }, [selectedProjectId, statusFilter]);

  // Timer for elapsed time during execution
  useEffect(() => {
    if (!isExecuting) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isExecuting]);

  // Handle project selection
  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedBeadId(null);
    setStatusFilter(null);
    setOutput("");
    setOutputState(undefined);
  }, []);

  // Handle bead selection
  const handleBeadSelect = useCallback((beadId: string) => {
    setSelectedBeadId(beadId);
  }, []);

  // Handle work action
  const handleWork = useCallback(async () => {
    if (!selectedProjectId || !selectedBeadId || isExecuting) return;

    setIsExecuting(true);
    setCurrentAction("work");
    setOutput("");
    setOutputState(undefined);

    try {
      const result = await actionApi.work(selectedProjectId, selectedBeadId);
      setOutput(result.output);
      setOutputState(result.state);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Work action failed";
      setOutput(`Error: ${message}`);
      setOutputState("failed");
    } finally {
      setIsExecuting(false);
      setCurrentAction(null);
    }
  }, [selectedProjectId, selectedBeadId, isExecuting]);

  // Handle review action
  const handleReview = useCallback(async () => {
    if (!selectedProjectId || isExecuting) return;

    setIsExecuting(true);
    setCurrentAction("review");
    setOutput("");
    setOutputState(undefined);

    try {
      const result = await actionApi.review(selectedProjectId);
      setOutput(result.output);
      setOutputState(result.state);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Review action failed";
      setOutput(`Error: ${message}`);
      setOutputState("failed");
    } finally {
      setIsExecuting(false);
      setCurrentAction(null);
    }
  }, [selectedProjectId, isExecuting]);

  // Handle push/PR action
  const handlePushPR = useCallback(async () => {
    if (!selectedProjectId || isExecuting) return;

    setIsExecuting(true);
    setCurrentAction("push-pr");
    setOutput("");
    setOutputState(undefined);

    try {
      const result = await actionApi.pushPR(selectedProjectId);
      // Combine push and PR output
      const combinedOutput = `## Push Output\n${result.push}\n\n## PR Output\n${result.pr}`;
      setOutput(combinedOutput);
      setOutputState("completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Push/PR action failed";
      setOutput(`Error: ${message}`);
      setOutputState("failed");
    } finally {
      setIsExecuting(false);
      setCurrentAction(null);
    }
  }, [selectedProjectId, isExecuting]);

  // Handle terminal button
  const handleTerminal = useCallback(() => {
    if (!selectedProjectId) return;
    setIsTerminalOpen(true);
  }, [selectedProjectId]);

  // Handle refresh progress
  const handleRefresh = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const progress = await actionApi.getProgress(selectedProjectId);
      if (progress.output) {
        setOutput(progress.output);
      }
    } catch {
      // Silently ignore refresh errors
    }
  }, [selectedProjectId]);

  // Get attach info for terminal
  const getAttachInfo = useCallback(() => {
    if (!selectedProjectId) {
      return Promise.reject(new Error("No project selected"));
    }
    return actionApi.getAttachInfo(selectedProjectId);
  }, [selectedProjectId]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4 md:py-6 sm:px-6 lg:px-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            DevContainer
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left column: Projects */}
            <div className="lg:col-span-1">
              <h2 className="text-sm font-medium text-gray-500 mb-3">Projects</h2>
              <ProjectList
                projects={projects}
                loading={projectsLoading}
                error={projectsError}
                selectedProjectId={selectedProjectId || undefined}
                onSelect={handleProjectSelect}
              />
            </div>

            {/* Middle column: Beads */}
            <div className="lg:col-span-1">
              <h2 className="text-sm font-medium text-gray-500 mb-3">Beads</h2>
              {selectedProjectId ? (
                <BeadList
                  beads={beads}
                  loading={beadsLoading}
                  onSelect={handleBeadSelect}
                  selectedBeadId={selectedBeadId || undefined}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                />
              ) : (
                <p className="text-gray-400 text-sm">Select a project to view beads</p>
              )}
            </div>

            {/* Right column: Output */}
            <div className="lg:col-span-1">
              <h2 className="text-sm font-medium text-gray-500 mb-3">Output</h2>
              <OutputView output={output} state={outputState} />
            </div>
          </div>
        </div>
      </main>

      {/* ActionBar */}
      <ActionBar
        hasProject={!!selectedProjectId}
        hasBead={!!selectedBeadId}
        isExecuting={isExecuting}
        currentAction={currentAction}
        elapsedTime={elapsedTime}
        onWork={handleWork}
        onReview={handleReview}
        onPushPR={handlePushPR}
        onTerminal={handleTerminal}
        onRefresh={isExecuting ? handleRefresh : undefined}
      />

      {/* Terminal Modal */}
      <TerminalEmbed
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        getAttachInfo={getAttachInfo}
      />
    </div>
  );
}

export default App;
