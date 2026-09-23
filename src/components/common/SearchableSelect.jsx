import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check, Plus } from 'lucide-react';

/**
 * Modern, accessible, searchable select/combobox component
 *
 * @param {Array<string|{value: string, label: string}>} options - List of options
 * @param {string} value - Currently selected value
 * @param {function(string): void} onChange - Change handler passing the selected value string
 * @param {string} placeholder - Display text when nothing is selected
 * @param {string} searchPlaceholder - Placeholder for the search input
 * @param {boolean} disabled - Whether the select is disabled
 * @param {boolean} compact - Compact height for tight spaces (like slot cards)
 * @param {string} error - Error string if validation failed
 * @param {string} className - Additional CSS class name
 * @param {object} style - Inline styles for outer wrapper
 * @param {boolean} allowClear - Allow resetting the selection
 * @param {boolean} allowCustom - Allow typing and selecting a custom value
 * @param {string} id - HTML ID
 */
export function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = '-- Select --',
  searchPlaceholder = 'Search...',
  disabled = false,
  compact = false,
  error = '',
  className = '',
  style = {},
  allowClear = false,
  allowCustom = false,
  id
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropUp, setDropUp] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to [{ value, label }]
  const normalizedOptions = options.map(opt => {
    if (opt !== null && typeof opt === 'object' && 'value' in opt) {
      return { value: String(opt.value), label: String(opt.label || opt.value) };
    }
    const str = String(opt || '');
    return { value: str, label: str };
  });

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter(opt => {
    if (!searchQuery.trim()) return true;
    return opt.label.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  // Current selected option object
  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : '';

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Check if dropdown should open upwards
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 240px below and more space above, open up
      if (spaceBelow < 240 && spaceAbove > spaceBelow) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(prev => !prev);
  };

  const handleSelect = (val) => {
    if (onChange) {
      onChange(val);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('');
    }
    setSearchQuery('');
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else if (allowCustom && searchQuery.trim()) {
          handleSelect(searchQuery.trim());
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      id={id}
      className={`relative w-full ${className}`}
      style={style}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <div
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={handleToggle}
        className={`flex items-center justify-between gap-2 w-full select-none outline-none transition-all ${
          compact ? 'px-2.5 py-[7px] rounded-lg text-sm' : 'px-3.5 py-2.5 rounded-lg text-sm'
        } ${disabled ? 'bg-slate-50 cursor-not-allowed' : 'bg-white cursor-pointer'} ${
          error
            ? 'border border-rose-500'
            : isOpen
            ? 'border border-indigo-500 ring-2 ring-indigo-500/15'
            : 'border border-slate-200'
        } ${displayText ? 'text-slate-900 font-medium' : 'text-slate-400'}`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-left">
          {displayText || placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && displayText && !disabled && (
            <span
              onClick={handleClear}
              title="Clear selection"
              className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-slate-200 text-slate-600 cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={compact ? 15 : 18}
            className={`transition-transform ${isOpen ? 'text-indigo-600 rotate-180' : 'text-slate-500 rotate-0'}`}
          />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 bg-white rounded-lg border border-slate-200 shadow-2xl z-[9999] overflow-hidden animate-dropdown-in ${
            dropUp ? 'bottom-[calc(100%+4px)] top-auto' : 'top-[calc(100%+4px)] bottom-auto'
          }`}
        >
          {/* Search Input Box */}
          <div
            className="px-2.5 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            <Search size={15} className="text-indigo-600 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full border-none bg-transparent outline-none text-sm text-slate-900 font-medium placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="bg-transparent border-none text-slate-400 hover:text-slate-600 p-0.5 flex items-center"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} role="listbox" className="max-h-[220px] overflow-y-auto p-1">
            {/* Custom Option if allowCustom is enabled */}
            {allowCustom && searchQuery.trim() && !normalizedOptions.some(opt => opt.value.toLowerCase() === searchQuery.trim().toLowerCase()) && (
              <div
                role="option"
                onClick={() => handleSelect(searchQuery.trim())}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 cursor-pointer bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200/60 transition-colors"
              >
                <Plus size={15} className="text-indigo-600 shrink-0" />
                <span className="truncate">Add &ldquo;{searchQuery.trim()}&rdquo;</span>
              </div>
            )}

            {/* Optional "None / Empty" Option if placeholder was selected */}
            {placeholder && !searchQuery && (
              <div
                role="option"
                aria-selected={!value}
                onClick={() => handleSelect('')}
                onMouseEnter={() => setHighlightedIndex(-1)}
                className={`px-3 py-2 rounded-md text-sm italic cursor-pointer text-slate-400 mb-0.5 ${
                  !value ? 'bg-slate-100' : ''
                }`}
              >
                {placeholder}
              </div>
            )}

            {filteredOptions.length === 0 && (!allowCustom || !searchQuery.trim()) ? (
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-sm mb-0.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-800'
                        : 'text-slate-800'
                    }`}
                  >
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{opt.label}</span>
                    {isSelected && <Check size={16} className="text-indigo-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
