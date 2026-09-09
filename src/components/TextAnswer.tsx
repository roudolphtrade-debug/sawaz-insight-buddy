export function TextAnswer({
  label,
  placeholder,
  help,
  long = false,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string | undefined;
  help?: string | undefined;
  long?: boolean | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  const className =
    "mt-2 w-full rounded-xl border border-border-strong bg-surface-raised px-4 py-3.5 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10";

  return (
    <label className="block">
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-[0.6875rem] font-medium text-muted-foreground">
          Champ de réponse
        </span>
      </span>

      {help ? (
        <span className="mt-1 block whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {help}
        </span>
      ) : null}

      {long ? (
        <textarea
          rows={5}
          className={`${className} min-h-32 resize-y`}
          placeholder={placeholder ?? "Écris ta réponse ici…"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={className}
          placeholder={placeholder ?? "Écris ta réponse ici…"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}