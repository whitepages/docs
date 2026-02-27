import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="relative border-b">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fd-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search all states and counties..."
        className="w-full pl-10 pr-3 py-3 bg-fd-background text-fd-foreground focus:outline-none"
      />
    </div>
  );
}
