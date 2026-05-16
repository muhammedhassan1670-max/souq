import { ArrowRight, Check, Calendar, ChevronLeft } from 'lucide-react';
import { subscriptionPackages } from '@/data/subscriptions';
import { generateWhatsAppLink } from '@/utils/whatsapp';

export default function Subscriptions() {
  const handleSubscribe = (pkg: typeof subscriptionPackages[0]) => {
    const message = `أهلاً سوق البلد!\n\nعاوز أشترك في: ${pkg.name}\nالسعر: ${pkg.price} جنيه/${pkg.frequency === 'أسبوعي' ? 'أسبوع' : 'شهر'}\n\nالمنتجات:\n${pkg.items.map(i => `- ${i}`).join('\n')}`;
    window.open(generateWhatsAppLink(message), '_blank');
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-sahar to-sahar-dark py-8 px-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">طلبات البيت الشهرية</h1>
        </div>
        <p className="text-white/85 text-sm mr-11">
          اختار طلبات ثابتة توصلك كل أسبوع أو كل شهر
        </p>
      </div>

      {/* Packages */}
      <div className="px-4 py-4 space-y-4">
        {subscriptionPackages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white border-2 border-sand rounded-xl overflow-hidden transition-all hover:border-sahar hover:shadow-elevated"
          >
            <div className="flex">
              <img
                src={pkg.image}
                alt={pkg.name}
                className="w-24 h-24 object-cover flex-shrink-0"
              />
              <div className="p-3 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-charcoal text-sm">{pkg.name}</h3>
                    <p className="text-xs text-charcoal-muted mt-0.5">{pkg.description}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] bg-cream-warm px-2 py-0.5 rounded-full">
                    <Calendar className="w-3 h-3" />
                    {pkg.frequency}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-bold text-sahar-dark">{pkg.price} جنيه</span>
                  <span className="text-xs text-charcoal-muted">/{pkg.frequency === 'أسبوعي' ? 'أسبوع' : 'شهر'}</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="px-4 pb-3">
              <div className="border-t border-sand pt-3">
                <p className="text-xs font-semibold text-charcoal mb-2">المنتجات المشمولة:</p>
                <div className="grid grid-cols-2 gap-1">
                  {pkg.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                      <Check className="w-3 h-3 text-success flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleSubscribe(pkg)}
                className="w-full h-10 bg-sahar text-white rounded-xl font-semibold text-sm mt-3 flex items-center justify-center gap-1 hover:bg-sahar-dark transition-colors"
              >
                اشترك دلوقتي
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

