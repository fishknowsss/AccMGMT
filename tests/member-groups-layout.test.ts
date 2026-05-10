import { describe, expect, it } from 'vitest';
import {
  groupEditorListClassName,
  groupEditorRowClassName,
  memberEditorListClassName,
  memberEditorRowClassName,
} from '../src/components/account-board/account-board-page';

describe('member groups editor layout', () => {
  it('keeps group and member edit lists at fixed row heights instead of stretching to fill the panel', () => {
    expect(groupEditorListClassName).toContain('max-h-[280px]');
    expect(groupEditorListClassName).toContain('overflow-y-auto');
    expect(groupEditorListClassName).not.toContain('flex-1');
    expect(memberEditorListClassName).toContain('max-h-[360px]');
    expect(memberEditorListClassName).toContain('overflow-y-scroll');
    expect(memberEditorListClassName).not.toContain('flex-1');
    expect(groupEditorRowClassName).toContain('min-h-[68px]');
    expect(memberEditorRowClassName).toContain('min-h-[68px]');
  });
});
