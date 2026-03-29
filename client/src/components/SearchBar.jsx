import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) {
      const fetchResults = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/search/users?q=${query}`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            setResults(data);
            setIsOpen(true);
          }
        } catch (e) {
          console.error("Search failed");
        }
      };
      const debounceTimer = setTimeout(fetchResults, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  return (
    <div className="relative z-50 ml-4 hidden md:block" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if(results.length > 0) setIsOpen(true) }}
          placeholder="Search profiles..."
          className="w-48 xl:w-64 bg-white border-2 border-black rounded-lg px-4 py-1.5 text-sm font-bold text-black placeholder:text-gray-400 outline-none focus:border-brand-pink focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        />
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-12 left-0 w-full xl:w-80 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0_rgba(0,0,0,1)] overflow-hidden">
          {results.map((r) => (
            <div
              key={r.id}
              onClick={() => {
                setIsOpen(false);
                setQuery("");
                navigate(`/users/${r.username}`);
              }}
              className="flex items-center gap-3 p-3 hover:bg-brand-yellow/20 cursor-pointer border-b border-gray-100 last:border-0"
            >
              <img src={r.avatarUrl} alt={r.username} className="w-8 h-8 rounded-full border border-black" />
              <div>
                <p className="text-sm font-black text-black leading-none">{r.username}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}