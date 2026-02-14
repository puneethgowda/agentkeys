interface ScopeToggleProps {
  availableScopes: string[];
  selectedScopes: string[];
  onChange: (scopes: string[]) => void;
}

export default function ScopeToggle({
  availableScopes,
  selectedScopes,
  onChange,
}: ScopeToggleProps) {
  const toggle = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      onChange(selectedScopes.filter((s) => s !== scope));
    } else {
      onChange([...selectedScopes, scope]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {availableScopes.map((scope) => (
        <button
          key={scope}
          type="button"
          onClick={() => toggle(scope)}
          className={`text-xs px-3 py-1.5 rounded border transition-colors ${
            selectedScopes.includes(scope)
              ? "bg-accent/10 border-accent text-accent"
              : "border-border text-text-secondary hover:border-border-hover"
          }`}
        >
          {scope}
        </button>
      ))}
    </div>
  );
}
