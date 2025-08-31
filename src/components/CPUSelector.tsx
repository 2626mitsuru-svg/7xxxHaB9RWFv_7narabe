import { Button } from './ui/button';
import { getCPUColor } from '../utils/cpuColors';

interface CPUSelectorProps {
  selectedCPUs: string[];
  onSelect: (cpuIds: string[]) => void;
  onStartGame: () => void;
}

const CPU_OPTIONS = [
  { id: 'cpu-01', name: 'CPU1' },
  { id: 'cpu-02', name: 'CPU2' },
  { id: 'cpu-03', name: 'CPU3' },
  { id: 'cpu-04', name: 'CPU4' },
  { id: 'cpu-05', name: 'CPU5' },
  { id: 'cpu-06', name: 'CPU6' },
  { id: 'cpu-07', name: 'CPU7' },
  { id: 'cpu-08', name: 'CPU8' },
  { id: 'cpu-09', name: 'CPU9' },
  { id: 'cpu-10', name: 'CPU10' },
  { id: 'cpu-11', name: 'CPU11' },
];

export function CPUSelector({ selectedCPUs, onSelect, onStartGame }: CPUSelectorProps) {
  const handleCPUToggle = (cpuId: string) => {
    if (selectedCPUs.includes(cpuId)) {
      onSelect(selectedCPUs.filter(id => id !== cpuId));
    } else if (selectedCPUs.length < 4) {
      onSelect([...selectedCPUs, cpuId]);
    }
  };

  const handleRandomSelect = () => {
    const shuffled = [...CPU_OPTIONS].sort(() => Math.random() - 0.5);
    onSelect(shuffled.slice(0, 4).map(cpu => cpu.id));
  };

  const handleClearAll = () => {
    onSelect([]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">対戦CPU選択</h2>
        <p className="text-neutral-400">
          4人のCPUを選択してください ({selectedCPUs.length}/4)
        </p>
      </div>

      {/* 一括操作ボタン */}
      <div className="flex justify-center space-x-4">
        <Button
          variant="outline"
          onClick={handleRandomSelect}
          className="border-neutral-600 text-neutral-300 hover:bg-neutral-800"
        >
          🎲 ランダム選択
        </Button>
        <Button
          variant="outline"
          onClick={handleClearAll}
          disabled={selectedCPUs.length === 0}
          className="border-neutral-600 text-neutral-300 hover:bg-neutral-800"
        >
          🗑️ 全てクリア
        </Button>
      </div>

      {/* CPU選択グリッド */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {CPU_OPTIONS.map((cpu) => {
          const isSelected = selectedCPUs.includes(cpu.id);
          const cpuColor = getCPUColor(cpu.id);
          const isDisabled = !isSelected && selectedCPUs.length >= 4;

          return (
            <button
              key={cpu.id}
              onClick={() => handleCPUToggle(cpu.id)}
              disabled={isDisabled}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-left
                ${isSelected 
                  ? 'border-white bg-white/10 transform scale-105' 
                  : isDisabled
                    ? 'border-neutral-700 bg-neutral-800/50 opacity-50 cursor-not-allowed'
                    : 'border-neutral-600 bg-neutral-800/70 hover:bg-neutral-700/70 hover:border-neutral-500'
                }
              `}
              style={{
                borderColor: isSelected ? cpuColor.primary : undefined,
                boxShadow: isSelected ? `0 0 20px rgba(${cpuColor.rgb}, 0.3)` : undefined,
              }}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cpuColor.primary }}
                />
                <div className="flex-1 min-w-0">
                  <h3 
                    className="font-bold text-sm"
                    style={{ color: isSelected ? cpuColor.primary : undefined }}
                  >
                    {cpu.name}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {cpuColor.name}
                  </p>
                </div>
                {isSelected && (
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: cpuColor.primary }}
                  >
                    ✓
                  </div>
                )}
              </div>
              
              {/* キャラクター画像プレビュー */}
              <div className="mt-2 flex justify-center">
                <img
                  src={`https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/${cpu.id.match(/\d+/)?.[0]?.padStart(2, '0') || '01'}/neutral.png`}
                  alt={`${cpu.name}のプレビュー`}
                  className="w-12 h-12 rounded-full object-cover border-2"
                  style={{ borderColor: cpuColor.primary }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://via.placeholder.com/48/${cpuColor.primary.slice(1)}/ffffff?text=${cpuColor.name}`;
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* 選択されたCPUの確認 */}
      {selectedCPUs.length > 0 && (
        <div className="bg-neutral-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">選択されたCPU:</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCPUs.map((cpuId) => {
              const cpu = CPU_OPTIONS.find(c => c.id === cpuId);
              const cpuColor = getCPUColor(cpuId);
              return cpu ? (
                <div 
                  key={cpuId}
                  className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm border"
                  style={{ 
                    borderColor: cpuColor.primary,
                    backgroundColor: `rgba(${cpuColor.rgb}, 0.1)`
                  }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cpuColor.primary }}
                  />
                  <span style={{ color: cpuColor.primary }}>
                    {cpu.name}
                  </span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* ゲーム開始ボタン */}
      <div className="text-center">
        <Button
          onClick={onStartGame}
          disabled={selectedCPUs.length !== 4}
          className={`
            px-8 py-3 text-lg font-bold transition-all duration-300
            ${selectedCPUs.length === 4
              ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
              : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
            }
          `}
        >
          {selectedCPUs.length === 4 ? '🎮 ゲーム開始！' : `CPUを${4 - selectedCPUs.length}人選択してください`}
        </Button>
      </div>
    </div>
  );
}