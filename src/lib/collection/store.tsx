import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { collectionService } from "./collectionService";
import { emptyState, type AnswerValue, type CollectionState, type FileMeta } from "./types";

export type RemoteStatus = "idle" | "syncing" | "online" | "offline" | "submitted";

type Ctx = {
  state: CollectionState;
  hydrated: boolean;
  remoteStatus: RemoteStatus;
  setAnswer: (key: string, value: AnswerValue) => void;
  addFiles: (slot: string, files: File[]) => void;
  removeFile: (slot: string, id: string) => void;
  markSubmitted: (at: number | null) => void;
  refresh: () => void;
  reset: () => void;
};

const CollectionContext = createContext<Ctx | null>(null);

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `f_${Math.random().toString(36).slice(2)}_${Date.now()}`;

const AUTOSAVE_DELAY = 700;

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CollectionState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>("idle");
  const hydratedRef = useRef(false);
  const onlineRef = useRef(false);
  const pendingAnswers = useRef<Record<string, AnswerValue>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Hydratation : cache local d'abord, puis vérité serveur. */
  useEffect(() => {
    setState(collectionService.load());
    hydratedRef.current = true;
    setHydrated(true);

    let cancelled = false;

    const sync = async () => {
      setRemoteStatus("syncing");
      const url = new URL(window.location.href);
      const token = url.searchParams.get("t");

      let res = token
        ? await collectionService.openLink(token)
        : await collectionService.snapshot();

      // Le secret ne doit jamais rester dans l'URL ni dans l'historique.
      if (token) {
        url.searchParams.delete("t");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        if (!res.ok) res = await collectionService.snapshot();
      }

      if (cancelled) return;
      if (!res.ok) {
        onlineRef.current = false;
        setRemoteStatus("offline");
        return;
      }

      onlineRef.current = true;
      const next = collectionService.fromSnapshot(res.data);
      setState(next);
      setRemoteStatus(res.data.status === "submitted" ? "submitted" : "online");
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Cache UX de secours. */
  useEffect(() => {
    if (!hydratedRef.current) return;
    collectionService.save(state);
  }, [state]);

  const flushAnswers = useCallback(async () => {
    const payload = pendingAnswers.current;
    pendingAnswers.current = {};
    if (!onlineRef.current || Object.keys(payload).length === 0) return;
    const res = await collectionService.saveAnswers(payload);
    if (!res.ok) setRemoteStatus(res.error.includes("figées") ? "submitted" : "offline");
  }, []);

  const setAnswer = useCallback(
    (key: string, value: AnswerValue) => {
      setState((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }));
      pendingAnswers.current[key] = value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flushAnswers(), AUTOSAVE_DELAY);
    },
    [flushAnswers],
  );

  useEffect(() => {
    const handler = () => void flushAnswers();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flushAnswers]);

  const patchFile = useCallback((slot: string, id: string, patch: Partial<FileMeta>) => {
    setState((prev) => ({
      ...prev,
      files: {
        ...prev.files,
        [slot]: (prev.files[slot] ?? []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
      },
    }));
  }, []);

  const dropFile = useCallback((slot: string, id: string) => {
    setState((prev) => ({
      ...prev,
      files: { ...prev.files, [slot]: (prev.files[slot] ?? []).filter((f) => f.id !== id) },
    }));
  }, []);

  const addFiles = useCallback(
    (slot: string, files: File[]) => {
      if (files.length === 0) return;
      const metas: FileMeta[] = files.map((file) => {
        const meta: FileMeta = {
          id: newId(),
          name: file.name,
          size: file.size,
          type: file.type,
          addedAt: Date.now(),
          ...(onlineRef.current ? { pending: true } : {}),
        };
        collectionService.registerFile(meta, file);
        return meta;
      });

      setState((prev) => ({
        ...prev,
        files: { ...prev.files, [slot]: [...(prev.files[slot] ?? []), ...metas] },
      }));

      if (!onlineRef.current) return;

      metas.forEach((meta, index) => {
        const file = files[index];
        if (!file) return;
        void collectionService.uploadFile(slot, file).then((res) => {
          if (res.ok) {
            patchFile(slot, meta.id, { remoteId: res.data.id, pending: false });
          } else {
            patchFile(slot, meta.id, { pending: false, error: res.error });
          }
        });
      });
    },
    [patchFile],
  );

  const removeFile = useCallback(
    (slot: string, id: string) => {
      const meta = (state.files[slot] ?? []).find((f) => f.id === id);
      collectionService.forgetFile(id);
      dropFile(slot, id);
      if (meta?.remoteId && onlineRef.current) {
        void collectionService.deleteFile(meta.remoteId);
      }
    },
    [dropFile, state.files],
  );

  const markSubmitted = useCallback((at: number | null) => {
    setState((prev) => ({ ...prev, submittedAt: at }));
    if (at !== null) setRemoteStatus("submitted");
  }, []);

  const refresh = useCallback(() => {
    void collectionService.snapshot().then((res) => {
      if (!res.ok) return;
      onlineRef.current = true;
      setState(collectionService.fromSnapshot(res.data));
      setRemoteStatus(res.data.status === "submitted" ? "submitted" : "online");
    });
  }, []);

  const reset = useCallback(() => {
    collectionService.clear();
    setState(emptyState);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      hydrated,
      remoteStatus,
      setAnswer,
      addFiles,
      removeFile,
      markSubmitted,
      refresh,
      reset,
    }),
    [
      state,
      hydrated,
      remoteStatus,
      setAnswer,
      addFiles,
      removeFile,
      markSubmitted,
      refresh,
      reset,
    ],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection doit être utilisé dans <CollectionProvider>");
  return ctx;
}

export function useTextAnswer(key: string): [string, (v: string) => void] {
  const { state, setAnswer } = useCollection();
  const raw = state.answers[key];
  const value = typeof raw === "string" ? raw : "";
  return [value, (v: string) => setAnswer(key, v)];
}

export function useSingleChoice(key: string): [string | null, (v: string) => void] {
  const { state, setAnswer } = useCollection();
  const raw = state.answers[key];
  const value = typeof raw === "string" ? raw : null;
  return [value, (v: string) => setAnswer(key, v)];
}

export function useMultiChoice(key: string): [string[], (v: string) => void] {
  const { state, setAnswer } = useCollection();
  const raw = state.answers[key];
  const values = Array.isArray(raw) ? raw : [];
  const toggle = (v: string) =>
    setAnswer(key, values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return [values, toggle];
}

export function useBoolAnswer(key: string): [boolean, () => void] {
  const { state, setAnswer } = useCollection();
  const value = state.answers[key] === true;
  return [value, () => setAnswer(key, !value)];
}

export function useSlotFiles(slot: string) {
  const { state, addFiles, removeFile } = useCollection();
  const files = state.files[slot] ?? [];
  return {
    files,
    add: (list: File[]) => addFiles(slot, list),
    remove: (id: string) => removeFile(slot, id),
  };
}
