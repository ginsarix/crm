import { describe, expect, it } from 'vitest';
import { foldTurkish, turkishCommandFilter } from './turkish-fold';

describe('foldTurkish', () => {
  it('collapses every i-variant onto a single bucket', () => {
    for (const variant of ['I', 'İ', 'ı', 'i']) {
      expect(foldTurkish(variant)).toBe('i');
    }
  });

  it('lowercases the remaining Turkish letters', () => {
    expect(foldTurkish('ÇĞÖŞÜ')).toBe('çğöşü');
  });

  it('strips the combining dot left by decomposed input', () => {
    expect(foldTurkish('İSTANBUL')).toBe('istanbul');
    expect(foldTurkish('İSTANBUL'.toLowerCase())).toBe('istanbul');
  });

  it('folds both sides of a real search to the same string', () => {
    const pairs = [
      ['ısparta', 'ISPARTA'],
      ['isparta', 'ISPARTA'],
      ['hacıbektaş', 'HACIBEKTAŞ'],
      ['hacibektas'.replace('s', 'ş'), 'HACIBEKTAŞ'],
      ['şişli', 'ŞİŞLİ'],
      ['istanbul', 'İSTANBUL'],
      ['KULLANICILAR', 'Kullanıcılar'],
      ['gülşehir', 'GÜLŞEHİR'],
    ] as const;
    for (const [query, stored] of pairs) {
      expect(foldTurkish(stored)).toContain(foldTurkish(query));
    }
  });

  it('leaves ASCII untouched', () => {
    expect(foldTurkish('Ahmet Yılmaz 34 ABC')).toBe('ahmet yilmaz 34 abc');
  });
});

describe('turkishCommandFilter', () => {
  const cases = [
    ['card-ISPARTA Ltd 123', 'ısparta'],
    ['card-IĞDIR Tarım', 'ığdır'],
    ['HACIBEKTAŞ', 'hacıbektaş'],
    ['KOZAKLI', 'kozaklı'],
    ['ACIGÖL', 'acıgöl'],
    ['Şişli Belediyesi', 'ŞİŞLİ'],
    ['Kullanıcılar', 'KULLANICILAR'],
    ['İSTANBUL TİCARET', 'istanbul'],
    ['GÜLŞEHİR', 'gülşehir'],
  ] as const;

  it('scores every Turkish case pairing as a match', () => {
    for (const [value, search] of cases) {
      expect(turkishCommandFilter(value, search)).toBeGreaterThan(0);
    }
  });

  it('ranks a case-only difference as highly as an exact match', () => {
    expect(turkishCommandFilter('ŞİŞLİ', 'şişli')).toBe(
      turkishCommandFilter('SISLI', 'sisli'),
    );
  });

  it('still rejects a genuine non-match', () => {
    expect(turkishCommandFilter('Kullanıcılar', 'zzz')).toBe(0);
  });

  it('matches through keywords', () => {
    expect(turkishCommandFilter('ABC', 'ığdır', ['IĞDIR'])).toBeGreaterThan(0);
  });
});
