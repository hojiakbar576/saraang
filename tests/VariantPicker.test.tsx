import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariantPicker } from '@/components/storefront/VariantPicker';
import { MOCK_PRODUCTS } from '@/data/mock/products';
import { COLORS } from '@/data/mock/taxonomy';

const colors = new Map(COLORS.map((c) => [c.id, c]));
const tee = MOCK_PRODUCTS.find((p) => p.slug === 'oversize-paxta-futbolka')!;

describe('<VariantPicker />', () => {
  it('disables sizes that are unavailable in the selected colour', async () => {
    const onSize = vi.fn();
    render(
      <VariantPicker product={tee} colors={colors} colorId="black" size={null} onColorChange={() => {}} onSizeChange={onSize} />,
    );
    const small = screen.getByRole('radio', { name: /^S — / });
    expect(small).toBeDisabled();
    await userEvent.click(small);
    expect(onSize).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('radio', { name: 'M' }));
    expect(onSize).toHaveBeenCalledWith('M');
  });
});
