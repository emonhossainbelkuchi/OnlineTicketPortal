import { ConsoleShortcuts } from '../components/ConsoleShortcuts';

export function MarketingPage() {
  return (
    <ConsoleShortcuts
      title="Marketing"
      message="Coupons, offers and promotional banners."
      links={[
        { label: 'Coupons', resource: 'Coupons' },
        { label: 'Coupon usages', resource: 'CouponUsages' },
        { label: 'Offers', resource: 'Offers' },
        { label: 'Promo banners', resource: 'PromoBanners' },
      ]}
    />
  );
}
