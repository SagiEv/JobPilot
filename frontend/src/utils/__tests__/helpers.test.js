import { describe, it, expect } from 'vitest';
import { getTextDirection } from '../helpers';

describe('getTextDirection', () => {
    it('returns rtl when Hebrew characters outnumber English characters, even with English prefix', () => {
        expect(getTextDirection('HR call: שיחה מצוינת עם המגייסת, ממשיכים לשלב הבא')).toBe('rtl');
    });

    it('returns ltr when English characters outnumber Hebrew characters, even with Hebrew word', () => {
        expect(getTextDirection('שלום - Great technical interview covering distributed systems and React')).toBe('ltr');
    });

    it('returns ltr for empty, numeric, or neutral text', () => {
        expect(getTextDirection('')).toBe('ltr');
        expect(getTextDirection(null)).toBe('ltr');
        expect(getTextDirection('12345 - 67890')).toBe('ltr');
    });
});
