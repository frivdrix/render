import React, { useState } from 'react';
import { X, Shuffle, Plus, Sparkles, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (spintaxString: string) => void;
}

export const SpintaxHelperModal: React.FC<Props> = ({ isOpen, onClose, onInsert }) => {
  const [options, setOptions] = useState<string[]>(['Hey', 'Hi', 'Hello', 'Quick question']);
  const [newOption, setNewOption] = useState('');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const generatedSpintax = `{${options.filter(Boolean).join('|')}}`;

  const presetTemplates = [
    {
      title: 'Greetings',
      options: ['Hey', 'Hi', 'Hello', 'Hey there'],
    },
    {
      title: 'Subject Hooks',
      options: ['Quick question regarding', 'Reaching out about', 'Thoughts on scaling', 'Quick idea for'],
    },
    {
      title: 'Call to Actions (CTAs)',
      options: [
        'Open to a quick 5-min chat this Thursday?',
        'Worth a brief conversation this week?',
        'Would you be opposed to exploring this?',
        'Do you have 5 minutes to connect tomorrow?',
      ],
    },
    {
      title: 'Signoffs',
      options: ['Best regards,', 'Best,', 'Cheers,', 'Warmly,'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Spintax Generator</h3>
              <p className="text-xs text-slate-400">Randomize phrasing so every lead receives unique copy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Presets */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Popular Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presetTemplates.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setOptions(preset.options)}
                  className="p-2.5 text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 hover:bg-purple-500/5 transition text-xs group"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-purple-300 block">
                    {preset.title}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                    {preset.options.join(' | ')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Options */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Variations ({options.length})
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[idx] = e.target.value;
                      setOptions(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add another option..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                  className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleAddOption}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Result Preview */}
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Generated Syntax
            </p>
            <p className="font-mono text-xs text-purple-200 break-all">{generatedSpintax}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onInsert(generatedSpintax);
              onClose();
            }}
            disabled={options.filter(Boolean).length === 0}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
          >
            <Check className="w-4 h-4" />
            Insert into Template
          </button>
        </div>
      </div>
    </div>
  );
};
