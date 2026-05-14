import { ArrowRight, Star, Gift, TrendingUp, Lock } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function LoyaltyPoints() {
  const { getLoyaltyPoints } = useCart();
  const points = getLoyaltyPoints();

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-cream/95 backdrop-blur border-b border-sand">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm">
            <ArrowRight className="w-5 h-5 text-charcoal" />
          </button>
          <h1 className="text-lg font-bold text-charcoal">نقط البلد</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Points Balance */}
        <div className="bg-gradient-to-br from-sahar-light via-sahar to-sahar-dark rounded-2xl p-6 text-center mb-6">
          <Star className="w-10 h-10 text-white mx-auto mb-2" />
          <p className="text-white/80 text-sm">رصيد نقطك</p>
          <p className="text-5xl font-extrabold text-white mt-1">{points}</p>
          <p className="text-white/70 text-xs mt-2">نقطة</p>
        </div>

        {/* Rules */}
        <div className="bg-white border border-sand rounded-xl p-4 mb-6">
          <h3 className="font-bold text-charcoal mb-4">إزاي تكسب نقط؟</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-sahar/15 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-sahar-dark" />
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">كل 100 جنيه = نقطة</p>
                <p className="text-xs text-charcoal-muted">اكسب نقطة على كل 100 جنيه في طلبك</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-sahar/15 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-sahar-dark" />
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">أول طلب = 5 نقط هدية</p>
                <p className="text-xs text-charcoal-muted">اكسب 5 نقط إضافية في أول طلب ليك</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-sahar/15 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-sahar-dark" />
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">استبدل النقاط بخصومات</p>
                <p className="text-xs text-charcoal-muted">قريباً هتقدر تستبدل النقاط بخصومات حلوة</p>
              </div>
            </div>
          </div>
        </div>

        {/* Redeem Options - Coming Soon */}
        <div className="bg-white border border-sand rounded-xl p-4 opacity-60">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-charcoal-muted" />
            <h3 className="font-bold text-charcoal">استبدال النقاط</h3>
          </div>
          <p className="text-sm text-charcoal-muted text-center py-4">
            قريباً هتقدر تستبدل نقطك بخصومات وهدايا!
          </p>
        </div>
      </div>
    </div>
  );
}

