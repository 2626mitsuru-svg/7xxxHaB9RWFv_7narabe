import { extractCPUNumber, getCPUColor, CPU_COLORS } from '../utils/cpuColors';

describe('CPU Colors System', () => {
  test('extractCPUNumber normalizes leading zeros', () => {
    expect(extractCPUNumber('cpu-01')).toBe('1');
    expect(extractCPUNumber('cpu01')).toBe('1');
    expect(extractCPUNumber('cpu-10')).toBe('10');
    expect(extractCPUNumber('cpu10')).toBe('10');
    expect(extractCPUNumber('cpu_11')).toBe('11');
    expect(extractCPUNumber('11')).toBe('11');
    expect(extractCPUNumber('1')).toBe('1');
  });

  test('extractCPUNumber handles edge cases safely', () => {
    expect(extractCPUNumber('cpu-99')).toBe('1'); // 範囲外
    expect(extractCPUNumber('cpu-00')).toBe('1'); // ゼロ
    expect(extractCPUNumber('cpu-abc')).toBe('1'); // 非数値
    expect(extractCPUNumber('invalid')).toBe('1'); // 完全に不正
    expect(extractCPUNumber('')).toBe('1'); // 空文字
  });

  test('getCPUColor resolves correct primary colors', () => {
    expect(getCPUColor('cpu-01').primary).toBe('#191970'); // 1主
    expect(getCPUColor('cpu-02').primary).toBe('#1e90ff'); // 2主
    expect(getCPUColor('cpu-03').primary).toBe('#0000cd'); // 3主
    expect(getCPUColor('cpu-04').primary).toBe('#3cb371'); // 4主
    expect(getCPUColor('cpu-05').primary).toBe('#7b68ee'); // 5主
    expect(getCPUColor('cpu-06').primary).toBe('#00bfff'); // 6主
    expect(getCPUColor('cpu-07').primary).toBe('#20b2aa'); // 7主
    expect(getCPUColor('cpu-08').primary).toBe('#ff8c00'); // 8主
    expect(getCPUColor('cpu-09').primary).toBe('#da70d6'); // 9主
    expect(getCPUColor('cpu-10').primary).toBe('#b22222'); // 10主
    expect(getCPUColor('cpu-11').primary).toBe('#9932cc'); // 11主
  });

  test('getCPUColor resolves correct names', () => {
    expect(getCPUColor('cpu-01').name).toBe('1主');
    expect(getCPUColor('cpu-02').name).toBe('2主');
    expect(getCPUColor('cpu-11').name).toBe('11主');
  });

  test('CPU_COLORS contains all expected entries', () => {
    const expectedColors = [
      '#191970', '#1e90ff', '#0000cd', '#3cb371', '#7b68ee',
      '#00bfff', '#20b2aa', '#ff8c00', '#da70d6', '#b22222', '#9932cc'
    ];
    
    for (let i = 1; i <= 11; i++) {
      expect(CPU_COLORS[String(i)]).toBeDefined();
      expect(CPU_COLORS[String(i)].primary).toBe(expectedColors[i - 1]);
      expect(CPU_COLORS[String(i)].name).toBe(`${i}主`);
      expect(CPU_COLORS[String(i)].id).toBe(String(i));
    }
  });

  test('getCPUColor handles various input formats', () => {
    // 全て同じ色（1主）になることを確認
    const formats = ['cpu-01', 'cpu01', 'CPU-01', 'CPU01', '1', '01'];
    const expectedColor = '#191970';
    
    formats.forEach(format => {
      expect(getCPUColor(format).primary).toBe(expectedColor);
      expect(getCPUColor(format).name).toBe('1主');
    });
  });

  test('fallback behavior works correctly', () => {
    // 範囲外や不正な値は全て1主にフォールバック
    const invalidInputs = ['cpu-99', 'cpu-0', 'invalid', '', 'cpu-abc'];
    
    invalidInputs.forEach(input => {
      const color = getCPUColor(input);
      expect(color.primary).toBe('#191970'); // 1主の色
      expect(color.name).toBe('1主');
      expect(color.id).toBe('1');
    });
  });
});