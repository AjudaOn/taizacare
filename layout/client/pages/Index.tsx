import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Wind, 
  Maximize, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  Star,
  ShoppingBag,
  Info,
  ChevronRight,
  ArrowRight,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Sub-components moved outside to ensure stable component identity
const FeatureItem = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="group">
    <div className="mb-8 text-brand-taupe opacity-60 group-hover:opacity-100 transition-opacity duration-500">
      {icon}
    </div>
    <h3 className="font-aserha text-2xl text-brand-charcoal mb-4">{title}</h3>
    <p className="text-brand-ink font-light leading-relaxed text-base">{desc}</p>
  </div>
);

const FloatingInput = ({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) => (
  <div className="space-y-3">
    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-gray px-1">{label}</label>
    <input 
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      inputMode={inputMode}
      className="w-full h-16 px-6 bg-brand-smoke border-transparent focus:bg-white focus:border-brand-taupe focus:ring-4 focus:ring-brand-taupe/5 rounded-2xl transition-all outline-none text-brand-charcoal placeholder:text-brand-gray/50 font-light"
    />
  </div>
);

const FooterColumn = ({ title, links }: { title: string, links: string[] }) => (
  <div className="space-y-6">
    <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-charcoal">{title}</h4>
    <ul className="space-y-3">
      {links.map(link => (
        <li key={link}><a href="#" className="text-sm text-brand-gray hover:text-brand-charcoal transition-colors font-light">{link}</a></li>
      ))}
    </ul>
  </div>
);

const SuccessState = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen bg-brand-paper flex items-center justify-center p-6">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center shadow-[0_32px_64px_-12px_rgba(175,164,152,0.15)] border border-brand-sand/20"
    >
      <div className="w-24 h-24 bg-brand-taupe/5 rounded-full flex items-center justify-center mx-auto mb-8 text-brand-taupe">
        <CheckCircle2 className="w-12 h-12 stroke-[1.5px]" />
      </div>
      <h1 className="font-aserha text-4xl text-brand-charcoal mb-6">Pedido Realizado</h1>
      <p className="text-brand-ink mb-10 leading-relaxed font-light">
        Sua jornada de recuperação começou. Enviamos os detalhes para o seu e-mail.
      </p>
      <div className="space-y-4">
        <Button className="w-full bg-brand-charcoal text-white h-16 rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all">
          Acompanhar Pedido
        </Button>
        <Button 
          variant="ghost" 
          className="w-full text-brand-taupe font-medium" 
          onClick={onBack}
        >
          Voltar ao início
        </Button>
      </div>
    </motion.div>
  </div>
);

export default function Index() {
  const checkoutRef = useRef<HTMLDivElement>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    email: "",
    phone: "",
    postalCode: "",
    street: "",
    number: "",
    complement: "",
    city: "",
    state: "",
  });
  const [shippingOptions, setShippingOptions] = useState<
    Array<{ serviceId: string | number; name: string; priceCents: number; deliveryTime?: number | null }>
  >([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [selectedShippingServiceId, setSelectedShippingServiceId] = useState<string | number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");

  const whatsappHref = useMemo(() => {
    const phone = "5544999760479";
    const text = encodeURIComponent(
      "Olá! Vim pelo site da Taiza Care e queria tirar uma dúvida sobre a Calcinha Pós-Parto.",
    );
    return `https://wa.me/${phone}?text=${text}`;
  }, []);

  const scrollToCheckout = () => {
    checkoutRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePurchase = () => {
    setIsPurchased(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const productPixPriceCents = 10990;
  const productCardPriceCents = Math.round(productPixPriceCents * 1.05);
  const productPriceCents = paymentMethod === "pix" ? productPixPriceCents : productCardPriceCents;
  const shippingPriceCents = useMemo(() => {
    if (selectedShippingServiceId == null) return 0;
    const option = shippingOptions.find((o) => String(o.serviceId) === String(selectedShippingServiceId));
    return option?.priceCents ?? 0;
  }, [selectedShippingServiceId, shippingOptions]);

  const productLineCents = productPriceCents * quantity;
  const totalPriceCents = productLineCents + shippingPriceCents;

  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  useEffect(() => {
    const cep = checkoutForm.postalCode.replace(/\D/g, "");
    if (cep.length !== 8) {
      setShippingOptions([]);
      setSelectedShippingServiceId(null);
      setShippingError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setShippingLoading(true);
      setShippingError(null);
      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toPostalCode: cep, quantity }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Erro ao cotar frete");
        }

        setShippingOptions(
          (data.options ?? []).map((o: any) => ({
            serviceId: o.serviceId,
            name: o.name,
            priceCents: o.priceCents,
            deliveryTime: o.deliveryTime ?? null,
          })),
        );

        if ((data.options ?? []).length && selectedShippingServiceId == null) {
          setSelectedShippingServiceId(data.options[0].serviceId);
        }
      } catch (e: any) {
        setShippingOptions([]);
        setSelectedShippingServiceId(null);
        setShippingError(e?.message || "Erro ao cotar frete");
      } finally {
        setShippingLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [checkoutForm.postalCode, selectedShippingServiceId, quantity]);

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      if (!selectedSize) throw new Error("Selecione um tamanho");
      if (!checkoutForm.name.trim()) throw new Error("Informe seu nome");
      if (!checkoutForm.email.trim()) throw new Error("Informe seu e-mail");
      if (!checkoutForm.phone.trim()) throw new Error("Informe seu WhatsApp");
      const cep = checkoutForm.postalCode.replace(/\D/g, "");
      if (cep.length !== 8) throw new Error("Informe um CEP válido");
      if (!checkoutForm.street.trim()) throw new Error("Informe a rua");
      if (!checkoutForm.number.trim()) throw new Error("Informe o número");
      if (!checkoutForm.city.trim()) throw new Error("Informe a cidade");
      if (!checkoutForm.state.trim() || checkoutForm.state.trim().length !== 2) throw new Error("Informe o UF");
      if (selectedShippingServiceId == null) throw new Error("Selecione uma opção de frete");

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          customer: {
            name: checkoutForm.name,
            email: checkoutForm.email,
            phone: checkoutForm.phone,
          },
          address: {
            postalCode: cep,
            street: checkoutForm.street,
            number: checkoutForm.number,
            complement: checkoutForm.complement,
            city: checkoutForm.city,
            state: checkoutForm.state,
          },
          shipping: {
            serviceId: selectedShippingServiceId,
          },
          product: {
            qty: quantity,
            size: selectedSize,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao criar pagamento");
      }

      if (data.initPoint) {
        window.location.href = data.initPoint;
        return;
      }

      handlePurchase();
    } catch (e: any) {
      alert(e?.message || "Erro");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (isPurchased) {
    return <SuccessState onBack={() => setIsPurchased(false)} />;
  }

      return (
    <div className="min-h-screen bg-brand-paper font-luxora text-brand-ink selection:bg-brand-taupe/10 overflow-x-hidden">
      {/* Dynamic Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-charcoal">
        <div className="container px-6 mx-auto flex items-center justify-between py-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 text-left"
            aria-label="Voltar ao topo"
          >
            <img
              src="/logo_branca.png"
              alt="Taiza Care"
              className="h-14 w-auto object-contain md:h-16"
            />
          </button>

          <Button
            onClick={scrollToCheckout}
            className="hidden h-11 rounded-full bg-white px-6 text-brand-charcoal hover:bg-brand-smoke md:flex"
          >
            Comprar
          </Button>
        </div>
      </nav>

      {/* Hero Section - Asymmetrical & Modern */}
      <header className="relative min-h-[90vh] flex items-center pt-24 lg:pt-0">
        <div className="container px-6 mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-0">
          <div className="w-full lg:w-1/2 relative z-10 lg:pr-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-12 bg-[#afa498]/40" />
                <span className="text-xs uppercase tracking-[0.3em] font-medium text-[#afa498]">Maternidade Consciente</span>
              </div>
              <h1 className="font-aserha text-5xl md:text-7xl lg:text-[5.5rem] leading-[0.95] text-[#3a3a3a] mb-8 tracking-tight">
                Conforto <br />
                <span className="italic font-light text-[#afa498]">Redefinido.</span>
              </h1>
              <p className="text-lg md:text-xl text-[#6c6c6c] mb-12 max-w-lg leading-relaxed font-light">
                Uma calcinha que une a ciência da fisioterapia pélvica a uma estética premium. Desenvolvida para oferecer conforto e segurança na recuperação pós-parto.
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                <Button 
                  onClick={scrollToCheckout}
                  className="bg-[#3a3a3a] hover:bg-black text-white h-16 px-10 rounded-full text-lg font-light transition-all shadow-xl shadow-black/5 group"
                >
                  Garantir a minha
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <div className="flex items-center gap-4 text-sm text-[#afa498]">
                  <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-[#d2c9be] shadow-sm" />
                    ))}
                  </div>
                  <span className="font-medium underline underline-offset-4">+2.4k avaliações</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="w-full lg:w-1/2 relative flex justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full aspect-[4/5] max-w-[500px]"
            >
              {/* Main Image with sophisticated border radius */}
              <div className="w-full h-full rounded-[4rem] rounded-tr-[12rem] overflow-hidden shadow-[0_64px_96px_-24px_rgba(175,164,152,0.3)]">
                <img 
                  src="/calcinha1.jpeg"
                  alt="Product Aesthetic"
                  className="w-full h-full object-cover scale-105"
                />
              </div>
              {/* Floating Element 1 */}
              <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-10 -left-10 bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/40 hidden md:block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#afa498] rounded-full flex items-center justify-center text-white">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#afa498]">Tecnologia</p>
                    <p className="text-sm font-aserha text-[#3a3a3a]">Compressão Inteligente</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
        
        {/* Background Texture/Shapes */}
        <div className="absolute top-0 right-0 w-[60%] h-full bg-[#f1eeeb] -z-10 rounded-bl-[15rem]" />
        <div className="absolute -bottom-24 left-1/4 w-64 h-64 bg-[#afa498]/10 rounded-full blur-[100px]" />
      </header>

      {/* Benefit Grid - Modern Minimalist */}
      <section className="py-32 bg-white">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-4 sticky top-32">
              <Badge className="bg-[#afa498]/10 text-[#afa498] hover:bg-[#afa498]/10 border-none px-4 py-1 mb-6">Benefícios</Badge>
              <h2 className="font-aserha text-4xl lg:text-5xl text-[#3a3a3a] leading-tight mb-8">
                Criada para <br />
                o novo corpo.
              </h2>
              <p className="text-[#6c6c6c] font-light leading-relaxed mb-12">
                O pós-parto exige cuidado, mas não exige que você abra mão de quem você é. Combinamos fisiologia com design minimalista e conforto.
              </p>
            </div>
            
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-20">
              <FeatureItem 
                icon={<Maximize className="w-10 h-10" />}
                title="Sustentação Muscular"
                desc="Proporciona suporte muscular adequado, sem compressão excessiva, permitindo que os músculos abdominais continuem ativos, respeitando o processo de recuperação natural do corpo."
              />
              <FeatureItem 
                icon={<Sparkles className="w-10 h-10" />}
                title="Drenagem Suave"
                desc="Com nível de compressão médio, ajuda a reduzir o inchaço dos primeiros dias."
              />
              <FeatureItem 
                icon={<Heart className="w-10 h-10" />}
                title="Cuidado Cicatricial"
                desc="Com toque suave nas áreas sensíveis, compressão uniforme do púbis até a cintura e sem costuras, evita acumulo de líquido acima ou abaixo da cicatriz, reduzindo o risco de complicações funcionais e estéticas. A calcinha essencial para a recuperação após cesárea!"
              />
              <FeatureItem 
                icon={<Wind className="w-10 h-10" />}
                title="Respirabilidade"
                desc="Tecido premium que mantém a temperatura ideal e a pele seca."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pregnancy Use - Comfort in Every Phase */}
      <section className="py-32 bg-[#f1eeeb]">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-5">
              <Badge className="bg-[#afa498]/10 text-[#afa498] hover:bg-[#afa498]/10 border-none px-4 py-1 mb-6">
                Gestação
              </Badge>
              <h2 className="font-aserha text-4xl lg:text-5xl text-[#3a3a3a] leading-[1.1] mb-8">
                Você não precisa esperar o pós-parto para sentir esse cuidado
              </h2>
              <p className="text-lg text-[#6c6c6c] font-light leading-relaxed">
                A calcinha Taiza Care já pode ser usada durante a gestação. O tecido tecnológico se adapta ao crescimento
                da barriga sem apertar, sem marcar e sem incomodar.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-10">
              <div>
                <p className="text-[#6c6c6c] font-light leading-relaxed mb-8">
                  Ela acompanha as mudanças do seu corpo mês a mês, oferecendo:
                </p>

                <ul className="space-y-4">
                  {[
                    "Sustentação suave para o abdome",
                    "Mais sensação de segurança ao caminhar",
                    "Conforto para a lombar e pelve no dia a dia",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#afa498]" />
                      <span className="text-base font-light leading-relaxed text-[#6c6c6c]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-lg text-[#6c6c6c] font-light leading-relaxed">
                <p>
                  É cuidado agora.
                  <br />
                  É suporte durante.
                  <br />
                  E continua sendo essencial no pós-parto.
                </p>
                <p className="mt-8">Porque você merece conforto em todas as fases da maternidade!</p>
              </div>

              <div>
                <Button
                  onClick={scrollToCheckout}
                  className="h-14 rounded-full bg-[#3a3a3a] px-8 text-white hover:bg-black transition-all"
                >
                  Quero esse conforto
                  <ChevronRight className="ml-2 h-5 w-5 opacity-80" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Authority - Modern Split Layout */}
      <section className="py-32 bg-white">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col lg:flex-row bg-white rounded-[4rem] overflow-hidden shadow-[0_48px_80px_-16px_rgba(175,164,152,0.12)] border border-[#d2c9be]/20">
            <div className="lg:w-1/2 relative min-h-[400px]">
              <img 
                src="/calcinha2.jpeg"
                className="absolute inset-0 w-full h-full object-cover"
                alt="Especialista"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>
            <div className="lg:w-1/2 p-12 lg:p-24 flex flex-col justify-center">
              <span className="text-xs uppercase tracking-[0.3em] text-[#afa498] font-bold mb-6">Expertise Pélvica</span>
              <h2 className="font-aserha text-4xl text-[#3a3a3a] mb-8 leading-[1.1]">
                "A calcinha ideal não apenas aperta; ela acolhe e orienta o corpo de volta ao lugar."
              </h2>
              <p className="text-lg text-[#6c6c6c] font-light leading-relaxed mb-10">
                Como fisioterapeuta pélvica, vejo o impacto de uma recuperação segura e orientada. A calcinha pós-parto Taiza Care foi desenhada para acelerar o processo de recuperação de forma respeitosa e confortável.
              </p>
              <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-[#afa498]" />
                <span className="font-aserha text-xl text-[#3a3a3a]">Dra. Izabela R. Camilo, Fisioterapeuta</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-[#f1eeeb]">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col lg:flex-row bg-white rounded-[4rem] overflow-hidden shadow-[0_48px_80px_-16px_rgba(175,164,152,0.12)] border border-[#d2c9be]/20">
            <div className="lg:w-1/2 relative min-h-[400px]">
              <img
                src="/calcinha2.jpeg"
                className="absolute inset-0 w-full h-full object-cover"
                alt="Especialista"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>
            <div className="lg:w-1/2 p-12 lg:p-24 flex flex-col justify-center">
              <span className="text-xs uppercase tracking-[0.3em] text-[#afa498] font-bold mb-6">Expertise Pélvica</span>
              <h2 className="font-aserha text-4xl text-[#3a3a3a] mb-8 leading-[1.1]">
                "Uma escolha errada nessa fase pode comprometer a recuperação e trazer prejuízos para o resto da vida."
              </h2>
              <p className="text-lg text-[#6c6c6c] font-light leading-relaxed mb-10">
                Recebo diversas pacientes com queixas relacionadas a cicatrização pós-parto. Muitas vezes é devido ao uso
                de calcinhas e cintas inadequadas, que possuem tecidos diferentes, compressões irregulares, costuras
                sobre a cicatriz ou compressão excessiva, que resultam em resultados estéticos e funcionais
                desfavoráveis.
              </p>
              <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-[#afa498]" />
                <span className="font-aserha text-xl text-[#3a3a3a]">Dra. Tainara B. da Mata, Fisioterapeuta</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Product Details */}
      <section className="py-32 bg-white">
        <div className="container px-6 mx-auto">
          <div className="text-center mb-24">
            <h2 className="font-aserha text-4xl lg:text-5xl text-[#3a3a3a] mb-6">Detalhes que Fazem a Diferença</h2>
            <p className="text-[#6c6c6c] font-light">Qualidade superior em cada fibra.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {[
              "Compressão média ideal",
              "Tecido tecnológico e respirável",
              "Acabamento Invisível",
              "Variedade de tamanhos",
              "Estabilização com conforto",
              "Desenvolvida por especialistas"
            ].map((item, i) => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={i}
                className="flex items-center gap-6 p-8 rounded-3xl bg-white border border-[#d2c9be]/20 hover:shadow-xl hover:shadow-[#afa498]/5 transition-all"
              >
                <div className="w-3 h-3 rounded-full bg-[#afa498]/30" />
                <span className="text-lg text-[#3a3a3a] font-medium">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - Elegant & Minimal */}
      <section className="py-32 bg-[#f1eeeb] relative overflow-hidden">
        <div className="container px-6 mx-auto relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-12">
               {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-[#afa498] fill-current" />)}
            </div>
            <div className="relative text-center">
              <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-[12rem] font-aserha text-[#afa498]/5 -z-10 leading-none">“</span>
              <p className="font-aserha text-3xl md:text-4xl text-[#3a3a3a] leading-tight mb-12 italic px-8">
                Superou minhas expectativas. Me senti segura para cuidar da minha filha sem aquela sensação de 'tudo solto' na barriga. Uma compressão confortável, sem me sentir sufocada.
              </p>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[#d2c9be] mb-4 shadow-inner" />
                <span className="font-bold text-[#3a3a3a]">Laylla Legnani</span>
                <span className="text-sm text-[#afa498]">Mãe da Lorena</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d2c9be]/30 to-transparent" />
      </section>

      {/* Modern Checkout Section */}
      <section ref={checkoutRef} className="py-32 bg-white scroll-mt-20">
        <div className="container px-6 mx-auto">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
              <div className="space-y-12">
                <div>
                  <h2 className="font-aserha text-5xl text-[#3a3a3a] mb-8">Comece sua <br /> Recuperação.</h2>
                  <p className="text-lg text-[#6c6c6c] font-light leading-relaxed">
                    Escolha o tamanho que melhor se adapta a você. Em caso de dúvida, siga as instruções abaixo:
                  </p>
                </div>
                
                <div className="space-y-6">
                  <h3 className="text-sm uppercase tracking-widest font-bold text-[#3a3a3a]">1. Tamanho</h3>
                  <p className="text-sm text-[#6c6c6c] font-light leading-relaxed">
                    <span className="font-medium text-[#3a3a3a]">Para o pós-parto:</span> Se baseie no tamanho de calcinha
                    que utilizava antes da gestação, pois nossos modelos já são desenvolvidos pensando no ganho de peso
                    gestacional. Por exemplo: se usava tamanho M antes da gestação, peça a calcinha de tamanho M para o
                    pós-parto!
                    <br />
                    <br />
                    <span className="font-medium text-[#3a3a3a]">Para a gestação:</span> Invista em um tamanho maior do que
                    utilizava antes da gestação, para garantir maior conforto conforme houver aumento do abdome!
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {["PP (34-36)", "P (36-38)", "M (40-42)", "G (44-46)", "GG (48-50)"].map((size) => (
                      <button 
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`h-20 rounded-2xl border-2 transition-all flex items-center justify-center font-medium ${
                          selectedSize === size 
                            ? 'border-[#3a3a3a] bg-[#3a3a3a] text-white' 
                            : 'border-[#d2c9be]/30 bg-white hover:border-[#afa498] text-[#3a3a3a]'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#d2c9be]/30 bg-white p-5">
                    <div>
                      <div className="text-sm font-medium text-[#3a3a3a]">Quantidade</div>
                      <div className="text-xs text-[#6c6c6c]">Selecione quantas unidades</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="h-10 w-10 rounded-full border border-[#d2c9be]/40 bg-[#F9F7F5] text-[#3a3a3a] hover:bg-white transition"
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <div className="min-w-10 text-center text-lg font-medium text-[#3a3a3a]">{quantity}</div>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                        className="h-10 w-10 rounded-full border border-[#d2c9be]/40 bg-[#F9F7F5] text-[#3a3a3a] hover:bg-white transition"
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-8 rounded-[2rem] bg-[#afa498]/5 border border-[#afa498]/10">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm text-[#6c6c6c]">Total</span>
                    <span className="text-4xl font-aserha text-[#3a3a3a]">{formatBRL(totalPriceCents)}</span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-[#6c6c6c]">
                    <div className="flex items-center justify-between">
                      <span>Produto</span>
                      <span className="font-medium text-[#3a3a3a] whitespace-nowrap tabular-nums">
                        {formatBRL(productLineCents)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Frete</span>
                      <span className="font-medium text-[#3a3a3a] whitespace-nowrap tabular-nums">
                        {shippingLoading ? "Calculando..." : shippingPriceCents ? formatBRL(shippingPriceCents) : "—"}
                      </span>
                    </div>
                    <p className="pt-2 text-[10px] text-[#afa498] font-medium">
                      {paymentMethod === "pix"
                        ? "Desconto no PIX • Pagamento instantâneo"
                        : "Cartão em até 3x • Juros do emissor/operadora"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-12 lg:p-16 rounded-[3rem] shadow-[0_48px_80px_-16px_rgba(175,164,152,0.15)] border border-[#d2c9be]/10">
                <h3 className="text-sm uppercase tracking-widest font-bold text-[#3a3a3a] mb-12 text-center">2. Entrega Expressa</h3>
                <div className="space-y-8">
                  <div className="space-y-3 rounded-2xl border border-[#d2c9be]/20 bg-[#F9F7F5] p-4">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#3a3a3a]">
                      Forma de pagamento
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <label
                        className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition ${
                          paymentMethod === "pix"
                            ? "border-[#3a3a3a] bg-white"
                            : "border-[#d2c9be]/30 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="pay"
                            checked={paymentMethod === "pix"}
                            onChange={() => setPaymentMethod("pix")}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="font-medium text-[#3a3a3a]">PIX</div>
                            <div className="text-xs text-[#6c6c6c]">(com desconto)</div>
                            <div className="mt-2 font-medium text-[#3a3a3a] whitespace-nowrap tabular-nums">
                              {formatBRL(productPixPriceCents)}
                            </div>
                            <div className="text-xs text-[#6c6c6c]">Pagamento instantâneo</div>
                          </div>
                        </div>
                      </label>
                      <label
                        className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition ${
                          paymentMethod === "card"
                            ? "border-[#3a3a3a] bg-white"
                            : "border-[#d2c9be]/30 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="pay"
                            checked={paymentMethod === "card"}
                            onChange={() => setPaymentMethod("card")}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="font-medium text-[#3a3a3a]">Cartão</div>
                            <div className="text-xs text-[#6c6c6c]">(em até 3x)</div>
                            <div className="mt-2 font-medium text-[#3a3a3a] whitespace-nowrap tabular-nums">
                              {formatBRL(productCardPriceCents)}
                            </div>
                            <div className="text-xs text-[#6c6c6c]">Parcelamento no cartão</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <FloatingInput
                    label="Nome completo"
                    placeholder="Seu nome"
                    value={checkoutForm.name}
                    onChange={(e) => setCheckoutForm((s) => ({ ...s, name: e.target.value }))}
                  />
                  <FloatingInput
                    label="Seu melhor e-mail"
                    placeholder="contato@exemplo.com"
                    value={checkoutForm.email}
                    onChange={(e) => setCheckoutForm((s) => ({ ...s, email: e.target.value }))}
                    inputMode="email"
                  />
                  <FloatingInput
                    label="WhatsApp"
                    placeholder="(44) 99976-0479"
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm((s) => ({ ...s, phone: e.target.value }))}
                    inputMode="tel"
                  />
                  <FloatingInput
                    label="CEP de Entrega"
                    placeholder="00000-000"
                    value={checkoutForm.postalCode}
                    onChange={(e) => setCheckoutForm((s) => ({ ...s, postalCode: e.target.value }))}
                    inputMode="numeric"
                  />
                  <FloatingInput
                    label="Rua"
                    placeholder="Ex: Av. Exemplo"
                    value={checkoutForm.street}
                    onChange={(e) => setCheckoutForm((s) => ({ ...s, street: e.target.value }))}
                  />
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FloatingInput
                      label="Número"
                      placeholder="Ex: 123"
                      value={checkoutForm.number}
                      onChange={(e) => setCheckoutForm((s) => ({ ...s, number: e.target.value }))}
                      inputMode="numeric"
                    />
                    <FloatingInput
                      label="Complemento (opcional)"
                      placeholder="Apto, bloco, casa..."
                      value={checkoutForm.complement}
                      onChange={(e) => setCheckoutForm((s) => ({ ...s, complement: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FloatingInput
                      label="Cidade"
                      placeholder="Ex: Umuarama"
                      value={checkoutForm.city}
                      onChange={(e) => setCheckoutForm((s) => ({ ...s, city: e.target.value }))}
                    />
                    <FloatingInput
                      label="UF"
                      placeholder="PR"
                      value={checkoutForm.state}
                      onChange={(e) => setCheckoutForm((s) => ({ ...s, state: e.target.value.toUpperCase() }))}
                    />
                  </div>

                  {shippingError && (
                    <p className="text-sm text-red-600">{shippingError}</p>
                  )}

                  {shippingOptions.length > 0 && (
                    <div className="space-y-3 rounded-2xl border border-[#d2c9be]/20 bg-[#F9F7F5] p-4">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#3a3a3a]">
                        Opções de frete
                      </p>
                      <div className="space-y-2">
                        {shippingOptions.map((opt) => (
                          <label
                            key={String(opt.serviceId)}
                            className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                              String(selectedShippingServiceId) === String(opt.serviceId)
                                ? "border-[#3a3a3a] bg-white"
                                : "border-[#d2c9be]/30 bg-white/60 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="shipping"
                                checked={String(selectedShippingServiceId) === String(opt.serviceId)}
                                onChange={() => setSelectedShippingServiceId(opt.serviceId)}
                              />
                              <div className="leading-tight">
                                <div className="font-medium text-[#3a3a3a]">{opt.name}</div>
                                {opt.deliveryTime != null && (
                                  <div className="text-xs text-[#6c6c6c]">{opt.deliveryTime} dia(s)</div>
                                )}
                              </div>
                            </div>
                            <div className="font-medium text-[#3a3a3a]">{formatBRL(opt.priceCents)}</div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-8 space-y-4">
                    <Button 
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      className="w-full h-20 bg-[#3a3a3a] hover:bg-black text-white rounded-2xl text-xl font-light shadow-2xl shadow-black/10 flex items-center justify-center gap-3 group transition-all"
                    >
                      {checkoutLoading ? "Gerando pagamento..." : "Finalizar Compra"}
                      <ShoppingBag className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </Button>
                    <p className="text-[10px] text-center text-[#b3b2b2] uppercase tracking-[0.2em]">Compra 100% Segura • SSL Encriptado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="pt-12 pb-24 bg-white border-t border-[#d2c9be]/20">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-16 md:gap-0">
            <div>
              <div className="font-aserha text-3xl text-[#3a3a3a] mb-6">TAIZA CARE</div>
              <p className="max-w-xs text-sm text-[#b3b2b2] font-light leading-relaxed">
                Elevando o padrão de cuidado no pós-parto através da união entre medicina pélvica e design minimalista.
              </p>
              <div className="mt-8 space-y-2 text-xs text-[#6c6c6c]">
                <div className="font-medium text-[#3a3a3a]">Taiza Care serviços de fisioterapia LTDA</div>
                <div>CNPJ: 63.866.791/0001-57</div>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[#afa498] hover:text-[#3a3a3a] transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp: +55 44 99976-0479
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-16">
              <FooterColumn title="Produto" links={["Benefícios", "Tamanhos", "Tecnologia"]} />
              <FooterColumn title="Suporte" links={["Trocas", "Privacidade", "Contato"]} />
            </div>
          </div>
          <div className="mt-24 pt-8 border-t border-[#d2c9be]/10 flex flex-col md:flex-row justify-between gap-6">
            <span className="text-[10px] uppercase tracking-widest text-[#b3b2b2]">
              © {new Date().getFullYear()} Taiza Care.
            </span>
            <div className="flex gap-6 text-[10px] uppercase tracking-widest font-bold text-[#3a3a3a]">
              <a
                href="https://www.instagram.com/taizapelvica?igsh=djJuaDkxd3lldmk3"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#afa498] transition-colors"
              >
                Instagram
              </a>
            </div>
          </div>
          <div className="mt-6 text-center text-[10px] uppercase tracking-widest text-[#b3b2b2]">
            Desenvolvido por{" "}
            <a
              href="https://ajudaon.com.br"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-[#3a3a3a] hover:text-[#afa498] transition-colors"
            >
              AjudaOn
            </a>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp (desktop) */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-[70] hidden md:flex items-center gap-3 rounded-full bg-[#25D366] px-5 py-3 text-white shadow-2xl shadow-black/20 hover:bg-[#1fb85a] transition-colors"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-medium">Falar no WhatsApp</span>
      </a>

      {/* Floating WhatsApp (mobile) */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl shadow-black/20 hover:bg-[#1fb85a] transition-colors md:hidden"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}
