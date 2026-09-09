import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

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
      className={`searchable-select-wrapper ${className} ${disabled ? 'disabled' : ''} ${error ? 'has-error' : ''}`}
      style={{ position: 'relative', width: '100%', ...style }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <div
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={handleToggle}
        className={`searchable-select-trigger ${compact ? 'compact' : ''} ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          padding: compact ? '7px 10px' : '10px 14px',
          background: disabled ? '#F8FAFC' : '#FFFFFF',
          border: error ? '1px solid #EF4444' : isOpen ? '1px solid #10B981' : '1px solid #CBD5E1',
          borderRadius: compact ? 8 : 10,
          color: displayText ? '#0F172A' : '#94A3B8',
          fontSize: compact ? '0.88rem' : '0.95rem',
          fontWeight: displayText ? 500 : 400,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          userSelect: 'none'
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            textAlign: 'left'
          }}
        >
          {displayText || placeholder}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {allowClear && displayText && !disabled && (
            <span
              onClick={handleClear}
              title="Clear selection"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#E2E8F0',
                color: '#475569',
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={compact ? 15 : 18}
            style={{
              color: isOpen ? '#059669' : '#64748B',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="searchable-select-dropdown"
          style={{
            position: 'absolute',
            ...(dropUp
              ? { bottom: 'calc(100% + 4px)', top: 'auto' }
              : { top: 'calc(100% + 4px)', bottom: 'auto' }),
            left: 0,
            right: 0,
            background: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #CBD5E1',
            boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.15s ease-out'
          }}
        >
          {/* Search Input Box */}
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onClick={e => e.stopPropagation()}
          >
            <Search size={15} color="#059669" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.86rem',
                color: '#0F172A',
                fontWeight: 500
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              padding: '4px'
            }}
          >
            {/* Optional "None / Empty" Option if placeholder was selected */}
            {placeholder && !searchQuery && (
              <div
                role="option"
                aria-selected={!value}
                onClick={() => handleSelect('')}
                onMouseEnter={() => setHighlightedIndex(-1)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  color: '#94A3B8',
                  fontStyle: 'italic',
                  cursor: 'pointer',
                  background: !value ? '#F1F5F9' : 'transparent',
                  transition: 'background 0.1s'
                }}
              >
                {placeholder}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: '#64748B'
                }}
              >
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: '0.88rem',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#065F46' : '#1E293B',
                      background: isSelected
                        ? '#ECFDF5'
                        : isHighlighted
                        ? '#F1F5F9'
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                      marginBottom: 2
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {isSelected && <Check size={16} color="#059669" style={{ flexShrink: 0 }} />}
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
