import React, { useRef, useState, useEffect, useMemo } from "react";
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
    <h3 className="font-brandSerif text-2xl text-brand-charcoal mb-4">{title}</h3>
    <p className="text-brand-ink font-light leading-relaxed text-base">{desc}</p>
  </div>
);

const FloatingInput = ({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
  required,
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
}) => (
  <div className="space-y-3">
    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-gray px-1">{label}</label>
    <input 
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      inputMode={inputMode}
      required={required}
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

const responsiveWidths = [320, 480, 640, 768, 960] as const;
const buildWebpSrcSet = (baseName: string) =>
  responsiveWidths
    .map((width) => {
      if (baseName === "bella" && width === 320) {
        return `/bella_320a.webp 320w`;
      }
      return `/${baseName}_${width}.webp ${width}w`;
    })
    .join(", ");
const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const SuccessState = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen bg-brand-paper flex items-center justify-center p-6">
    <div 
      className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center shadow-[0_32px_64px_-12px_rgba(175,164,152,0.15)] border border-brand-sand/20"
    >
      <div className="w-24 h-24 bg-brand-taupe/5 rounded-full flex items-center justify-center mx-auto mb-8 text-brand-taupe">
        <CheckCircle2 className="w-12 h-12 stroke-[1.5px]" />
      </div>
      <h1 className="font-brandSerif text-4xl text-brand-charcoal mb-6">Pedido Realizado</h1>
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
    </div>
  </div>
);

export default function Index() {
  const DAY_TO_DAY_FRAME_COUNT = 4;
  const DAY_TO_DAY_AUTO_ROTATE_MS = 4500;
  const DAY_TO_DAY_AUTO_ROTATE_MOBILE_MS = 7000;
  const checkoutRef = useRef<HTMLDivElement>(null);
  const dayToDaySectionRef = useRef<HTMLElement>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isDayToDayInView, setIsDayToDayInView] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    email: "",
    cpf: "",
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
  const [deliveryMethod, setDeliveryMethod] = useState<"shipping" | "pickup">("shipping");
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [addressLookupError, setAddressLookupError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3 | 4>(1);
  const [dayToDayFrame, setDayToDayFrame] = useState<1 | 2 | 3 | 4>(1);

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

  const dayToDayFrames = [
    {
      id: 1 as const,
      label: "Roupas",
      title: "Para usar com roupas justas",
      description:
        "A compressão inteligente ajuda no acabamento visual e no caimento sem perder conforto.",
      bullets: [
        "Suavizar o abdome",
        "Reduzir pequenas saliências",
        "Melhorar o caimento da roupa",
        "Proporcionar sensação de firmeza sem sufocar",
      ],
      image: "/foto_0003.jpeg",
      alt: "Uso no dia a dia com roupas ajustadas",
    },
    {
      id: 2 as const,
      label: "Inchaço",
      title: "Nos dias de inchaço",
      description:
        "Quando há retenção de líquido e estufamento, o suporte funcional traz mais estabilidade corporal.",
      bullets: [
        "Ajuda na sensação de contenção e estabilidade",
        "Promove maior percepção corporal",
        "Oferece segurança e acolhimento ao abdome",
      ],
      image: "/inchaco_960.webp",
      alt: "Conforto em dias de inchaço abdominal",
    },
    {
      id: 3 as const,
      label: "TPM",
      title: "Durante a TPM",
      description:
        "Com o abdome mais sensível, a peça atua como suporte suave para reduzir desconfortos do dia.",
      bullets: [
        "Diminuir a sensação de peso",
        "Oferecer estabilidade para a região abdominal",
        "Trazer mais conforto ao longo do dia",
      ],
      image: "/tpm_960.webp",
      alt: "Suporte abdominal em dias de TPM",
    },
    {
      id: 4 as const,
      label: "Rotina",
      title: "Para o dia a dia corrido",
      description:
        "No trabalho, sentada por longos períodos ou em movimento, o suporte mantém a sensação de alinhamento.",
      bullets: [
        "Melhora a sensação de postura",
        "Proporciona leve sustentação do abdome",
        "Aumenta a segurança corporal",
      ],
      image: "/foto_0005.jpeg",
      alt: "Rotina ativa com mais sustentação",
    },
  ] as const;

  const activeDayToDayFrame = dayToDayFrames[dayToDayFrame - 1] ?? dayToDayFrames[0];

  useEffect(() => {
    const sectionEl = dayToDaySectionRef.current;
    if (!sectionEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsDayToDayInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.35 },
    );

    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isDayToDayInView) return;

    const rotateMs = window.matchMedia("(max-width: 768px)").matches
      ? DAY_TO_DAY_AUTO_ROTATE_MOBILE_MS
      : DAY_TO_DAY_AUTO_ROTATE_MS;

    const intervalId = window.setInterval(() => {
      setDayToDayFrame((prev) => (prev === DAY_TO_DAY_FRAME_COUNT ? 1 : ((prev + 1) as 1 | 2 | 3 | 4)));
    }, rotateMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isDayToDayInView]);
  const handlePurchase = () => {
    setIsPurchased(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const productPixPriceCents = 10990;
  const productCardPriceCents = 11990;
  const productPriceCents = paymentMethod === "pix" ? productPixPriceCents : productCardPriceCents;
  const shippingPriceCents = useMemo(() => {
    if (deliveryMethod === "pickup") return 0;
    if (selectedShippingServiceId == null) return 0;
    const option = shippingOptions.find((o) => String(o.serviceId) === String(selectedShippingServiceId));
    return option?.priceCents ?? 0;
  }, [deliveryMethod, selectedShippingServiceId, shippingOptions]);

  const productLineCents = productPriceCents * quantity;
  const totalPriceCents = productLineCents + shippingPriceCents;

  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  useEffect(() => {
    if (deliveryMethod === "pickup") {
      setShippingLoading(false);
      setShippingError(null);
      return;
    }

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
  }, [deliveryMethod, checkoutForm.postalCode, selectedShippingServiceId, quantity]);

  useEffect(() => {
    if (deliveryMethod === "pickup") {
      setAddressLookupLoading(false);
      setAddressLookupError(null);
      return;
    }

    const cep = checkoutForm.postalCode.replace(/\D/g, "");
    if (cep.length !== 8) {
      setAddressLookupLoading(false);
      setAddressLookupError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setAddressLookupLoading(true);
      setAddressLookupError(null);
      try {
        const res = await fetch(`/api/address/lookup?postalCode=${cep}`);
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "CEP não encontrado");
        }

        setCheckoutForm((prev) => ({
          ...prev,
          street: data?.address?.street || prev.street,
          city: data?.address?.city || prev.city,
          state: (data?.address?.state || prev.state || "").toUpperCase(),
        }));
      } catch (e: any) {
        setAddressLookupError(e?.message || "Não foi possível buscar o endereço pelo CEP");
      } finally {
        setAddressLookupLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [deliveryMethod, checkoutForm.postalCode]);

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      if (!selectedSize) throw new Error("Selecione um tamanho");
      if (!checkoutForm.name.trim()) throw new Error("Informe seu nome");
      if (!checkoutForm.email.trim()) throw new Error("Informe seu e-mail");
      const cpfDigits = checkoutForm.cpf.replace(/\D/g, "");
      if (cpfDigits.length !== 11) throw new Error("Informe um CPF válido");
      if (!checkoutForm.phone.trim()) throw new Error("Informe seu WhatsApp");
      const shouldShip = deliveryMethod === "shipping";
      const cep = checkoutForm.postalCode.replace(/\D/g, "");
      if (shouldShip && cep.length !== 8) throw new Error("Informe um CEP válido");
      if (shouldShip && !checkoutForm.street.trim()) throw new Error("Informe a rua");
      if (shouldShip && !checkoutForm.number.trim()) throw new Error("Informe o número");
      if (shouldShip && !checkoutForm.city.trim()) throw new Error("Informe a cidade");
      if (shouldShip && (!checkoutForm.state.trim() || checkoutForm.state.trim().length !== 2)) {
        throw new Error("Informe o UF");
      }
      if (shouldShip && selectedShippingServiceId == null) throw new Error("Selecione uma opção de frete");

      const shippingPayload =
        deliveryMethod === "pickup"
          ? { method: "pickup" as const }
          : { method: "shipping" as const, serviceId: selectedShippingServiceId as string | number };
      const addressPayload =
        deliveryMethod === "shipping"
          ? {
              postalCode: cep,
              street: checkoutForm.street,
              number: checkoutForm.number,
              complement: checkoutForm.complement,
              city: checkoutForm.city,
              state: checkoutForm.state,
            }
          : undefined;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          customer: {
            name: checkoutForm.name,
            email: checkoutForm.email,
            cpf: checkoutForm.cpf,
            phone: checkoutForm.phone,
          },
          address: addressPayload,
          shipping: shippingPayload,
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

  function validateStep(step: 1 | 2 | 3 | 4): string | null {
    if (step === 1 && !selectedSize) return "Selecione um tamanho para continuar";
    if (step === 3) {
      if (!checkoutForm.name.trim()) return "Informe seu nome";
      if (!checkoutForm.email.trim()) return "Informe seu e-mail";
      if (checkoutForm.cpf.replace(/\D/g, "").length !== 11) return "Informe um CPF válido";
      if (!checkoutForm.phone.trim()) return "Informe seu WhatsApp";
    }
    if (step === 4 && deliveryMethod === "shipping") {
      const cep = checkoutForm.postalCode.replace(/\D/g, "");
      if (cep.length !== 8) return "Informe um CEP válido";
      if (!checkoutForm.street.trim()) return "Informe a rua";
      if (!checkoutForm.number.trim()) return "Informe o número";
      if (!checkoutForm.city.trim()) return "Informe a cidade";
      if (!checkoutForm.state.trim() || checkoutForm.state.trim().length !== 2) return "Informe o UF";
      if (selectedShippingServiceId == null) return "Selecione uma opção de frete";
    }
    return null;
  }

  function goToNextStep() {
    const error = validateStep(checkoutStep);
    if (error) {
      alert(error);
      return;
    }
    setCheckoutStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
  }

  function goToPreviousStep() {
    setCheckoutStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));
  }

  if (isPurchased) {
    return <SuccessState onBack={() => setIsPurchased(false)} />;
  }

      return (
    <div className="min-h-screen bg-brand-paper font-brandSans text-brand-ink selection:bg-brand-taupe/10 overflow-x-hidden">
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
              src="/logo_branca_960.webp"
              srcSet={buildWebpSrcSet("logo_branca")}
              sizes="(max-width: 768px) 140px, 180px"
              alt="Taiza Care"
              className="h-14 w-auto object-contain md:h-16"
              width={180}
              height={64}
              loading="eager"
              decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/foto_0003.jpeg";
                    }}
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
      <header className="relative min-h-[90vh] flex items-center pt-28">
        <div className="container px-6 mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-0">
          <div className="w-full lg:w-1/2 relative z-10 lg:pr-12">
            <div
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-12 bg-[#afa498]/40" />
                <span className="text-xs uppercase tracking-[0.3em] font-medium text-[#afa498]">Maternidade Consciente</span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] leading-[0.95] text-[#3a3a3a] mb-8 tracking-tight">
                Conforto <br />
                <span className="italic font-light text-[#afa498]">Redefinido.</span>
              </h1>
              <p className="text-lg md:text-xl text-[#6c6c6c] mb-12 max-w-lg leading-relaxed font-light">
                Uma calcinha que une a ciência da fisioterapia pélvica a uma estética premium. Desenvolvida para oferecer conforto e segurança na recuperação pós-parto.
              </p>
              <div className="mb-10 lg:hidden">
                <div className="relative mx-auto w-full max-w-[420px] aspect-[4/5]">
                  <div className="w-full h-full rounded-[3rem] rounded-tr-[8rem] overflow-hidden shadow-[0_40px_80px_-28px_rgba(175,164,152,0.35)]">
                    <img
                      src="/calcinha1_960.webp"
                      srcSet={buildWebpSrcSet("calcinha1")}
                      sizes="100vw"
                      alt="Product Aesthetic"
                      className="w-full h-full object-cover scale-105"
                      width={420}
                      height={525}
                      fetchPriority="high"
                      loading="eager"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/foto_0002.jpeg";
                      }}
                    />
                  </div>
                </div>
              </div>
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
            </div>
          </div>

          <div className="hidden w-full lg:flex lg:w-1/2 relative justify-end">
            <div
              className="relative w-full aspect-[4/5] max-w-[500px]"
            >
              {/* Main Image with sophisticated border radius */}
              <div className="w-full h-full rounded-[4rem] rounded-tr-[12rem] overflow-hidden shadow-[0_64px_96px_-24px_rgba(175,164,152,0.3)]">
                <img 
                  src="/calcinha1_960.webp"
                  srcSet={buildWebpSrcSet("calcinha1")}
                  sizes="(max-width: 1024px) 100vw, 500px"
                  alt="Product Aesthetic"
                  className="w-full h-full object-cover scale-105"
                  width={500}
                  height={625}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/foto_0002.jpeg";
                    }}
                  />
              </div>
              {/* Floating Element 1 */}
              <div 
                className="absolute -bottom-10 -left-10 bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/40 hidden md:block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#afa498] rounded-full flex items-center justify-center text-white">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#afa498]">Tecnologia</p>
                    <p className="text-sm font-brandSerif text-[#3a3a3a]">Compressão Inteligente</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Texture/Shapes */}
        <div className="absolute top-0 right-0 w-[60%] h-full bg-[#f1eeeb] -z-10 rounded-bl-[15rem]" />
        <div className="absolute -bottom-24 left-1/4 w-64 h-64 bg-[#afa498]/10 rounded-full blur-[100px]" />
      </header>

      {/* Benefit Grid - Modern Minimalist */}
      <section className="py-32 bg-white">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start lg:items-stretch">
            <div className="lg:col-span-4 sticky top-32 lg:flex lg:flex-col lg:self-stretch lg:items-start">
              <Badge className="bg-[#3a3a3a] text-white hover:bg-[#3a3a3a] border-none px-5 py-1.5 mb-6 text-[11px] font-semibold tracking-[0.18em] uppercase">
                Pós-parto
              </Badge>
              <h2 className="font-brandSerif text-4xl lg:text-5xl text-[#3a3a3a] leading-tight mb-8">
                Criada para o <br />
                <span className="text-[#8f8172]">Pós-parto.</span>
              </h2>
              <p className="text-[#6c6c6c] font-light leading-relaxed mb-12">
                O pós-parto exige cuidado, mas não exige que você abra mão de quem você é. Combinamos fisiologia com design minimalista e conforto.
              </p>
              <div className="relative w-full mt-8 lg:mt-auto overflow-hidden rounded-[2rem] border border-[#e7dfd8] bg-[#f6f2ee] shadow-[0_22px_50px_-28px_rgba(58,58,58,0.45)]">
                <img
                  src="/foto_0001.jpeg"
                  alt="Postpartum care detail"
                  className="w-full h-[320px] sm:h-[380px] lg:h-[430px] object-cover object-[center_26%]"
                  loading="lazy"
                  decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/foto_0002.jpeg";
                    }}
                  />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/15 to-transparent" />
              </div>
            </div>
            
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-14">
              <div className="rounded-[1.6rem] border border-[#ece4dc] bg-white p-7">
                <FeatureItem 
                  icon={<Maximize className="w-10 h-10" />}
                  title="Sustentação Muscular"
                  desc="Proporciona suporte muscular adequado, sem compressão excessiva, permitindo que os músculos abdominais continuem ativos, respeitando o processo de recuperação natural do corpo."
                />
              </div>
              <div className="rounded-[1.6rem] border border-[#ece4dc] bg-white p-7">
                <FeatureItem 
                  icon={<Sparkles className="w-10 h-10" />}
                  title="Drenagem Suave"
                  desc="Com nível de compressão médio, ajuda a reduzir o inchaço dos primeiros dias."
                />
              </div>
              <div className="rounded-[1.6rem] border border-[#ece4dc] bg-white p-7">
                <FeatureItem 
                  icon={<Heart className="w-10 h-10" />}
                  title="Cuidado Cicatricial"
                  desc="Com toque suave nas áreas sensíveis, compressão uniforme do púbis até a cintura e sem costuras, evita acumulo de líquido acima ou abaixo da cicatriz, reduzindo o risco de complicações funcionais e estéticas. A calcinha essencial para a recuperação após cesárea!"
                />
              </div>
              <div className="rounded-[1.6rem] border border-[#ece4dc] bg-white p-7">
                <FeatureItem 
                  icon={<Wind className="w-10 h-10" />}
                  title="Respirabilidade"
                  desc="Tecido premium que mantém a temperatura ideal e a pele seca."
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Pregnancy Use - Comfort in Every Phase */}
      <section className="py-32 bg-[#f6f2ee]">
        <div className="container px-6 mx-auto">
          <div className="space-y-14">
            <div>
              <Badge className="bg-[#3a3a3a] text-white hover:bg-[#3a3a3a] border-none px-5 py-1.5 mb-6 text-[11px] font-semibold tracking-[0.18em] uppercase">
                Gestação
              </Badge>
              <h2 className="font-brandSerif text-4xl lg:text-5xl text-[#3a3a3a] leading-[1.1] mb-8">
                Você não precisa esperar o pós-parto para sentir esse cuidado
              </h2>
              <p className="text-lg text-[#6c6c6c] font-light leading-relaxed text-pretty">
                A calcinha Taiza Care já pode ser usada durante a gestação. O tecido tecnológico se adapta ao crescimento
                da barriga sem apertar, sem marcar e sem incomodar.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start lg:items-stretch">
              <div className="lg:col-span-5 flex">
                <div className="relative w-full h-full min-h-[430px] overflow-hidden rounded-[2rem] border border-[#e7dfd8] bg-[#f6f2ee] shadow-[0_22px_50px_-28px_rgba(58,58,58,0.45)]">
                  <img
                    src="/foto_0002.jpeg"
                    alt="Gestação com conforto e sustentação"
                    className="absolute inset-0 block w-full h-full object-cover object-[center_24%] sm:object-[center_26%]"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/foto_0002.jpeg";
                    }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 via-black/8 to-transparent" />
                </div>
              </div>

              <div className="lg:col-span-7 flex flex-col gap-10 lg:min-h-[430px]">
                <div>
                  <p className="text-[#6c6c6c] font-light leading-relaxed mb-8 text-pretty">
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

                <div className="mt-auto">
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
        </div>
      </section>

      {/* Day-to-Day Use - Comfort Beyond Motherhood */}
      <section className="hidden py-32 bg-white">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-5">
              <Badge className="bg-[#3a3a3a] text-white hover:bg-[#3a3a3a] border-none px-5 py-1.5 mb-6 text-[11px] font-semibold tracking-[0.18em] uppercase">
                Dia a dia
              </Badge>
              <h2 className="font-brandSerif text-4xl lg:text-5xl text-[#3a3a3a] leading-[1.1] mb-8">
                Cuidado funcional para todos os dias
              </h2>
              <p className="text-lg text-[#6c6c6c] font-light leading-relaxed">
                A calcinha de compressão Taiza possui benefícios que vão além da gestação e pós-parto. Ela foi
                desenvolvida para acompanhar a mulher real: em todas as fases, todos os dias.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-10">
              <div>
                <div className="flex items-start gap-3 mb-6">
                  <Sparkles className="h-5 w-5 text-[#afa498] mt-1" />
                  <p className="text-[#6c6c6c] font-light leading-relaxed">
                    <span className="font-medium text-[#3a3a3a]">Para usar com roupas justas:</span> aquele vestido
                    mais ajustado, a alfaiataria estruturada ou a calça de cintura alta que pede um acabamento
                    impecável.
                  </p>
                </div>
                <p className="text-[#6c6c6c] font-light leading-relaxed mb-6">
                  A compressão inteligente ajuda a:
                </p>
                <ul className="space-y-4">
                  {[
                    "Suavizar o abdome",
                    "Reduzir pequenas saliências",
                    "Melhorar o caimento da roupa",
                    "Proporcionar sensação de firmeza sem sufocar",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#afa498]" />
                      <span className="text-base font-light leading-relaxed text-[#6c6c6c]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-start gap-3 mb-6">
                  <Sparkles className="h-5 w-5 text-[#afa498] mt-1" />
                  <p className="text-[#6c6c6c] font-light leading-relaxed">
                    <span className="font-medium text-[#3a3a3a]">Nos dias de inchaço:</span> retenção de líquido,
                    desconforto abdominal e sensação de estufamento.
                  </p>
                </div>
                <p className="text-[#6c6c6c] font-light leading-relaxed mb-6">A compressão suave:</p>
                <ul className="space-y-4">
                  {[
                    "Ajuda na sensação de contenção e estabilidade",
                    "Promove maior percepção corporal",
                    "Oferece segurança e acolhimento ao abdome",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#afa498]" />
                      <span className="text-base font-light leading-relaxed text-[#6c6c6c]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-start gap-3 mb-6">
                  <Sparkles className="h-5 w-5 text-[#afa498] mt-1" />
                  <p className="text-[#6c6c6c] font-light leading-relaxed">
                    <span className="font-medium text-[#3a3a3a]">Durante a TPM:</span> quando o abdome fica mais
                    sensível e inchado, a calcinha atua como suporte funcional, ajudando a:
                  </p>
                </div>
                <ul className="space-y-4">
                  {[
                    "Diminuir a sensação de peso",
                    "Oferecer estabilidade para a região abdominal",
                    "Trazer mais conforto ao longo do dia",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#afa498]" />
                      <span className="text-base font-light leading-relaxed text-[#6c6c6c]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-start gap-3 mb-6">
                  <Sparkles className="h-5 w-5 text-[#afa498] mt-1" />
                  <p className="text-[#6c6c6c] font-light leading-relaxed">
                    <span className="font-medium text-[#3a3a3a]">Para o dia a dia corrido:</span> no trabalho, em
                    longos períodos sentada ou em dias de muito movimento, a compressão funcional:
                  </p>
                </div>
                <ul className="space-y-4">
                  {[
                    "Melhora a sensação de postura",
                    "Proporciona leve sustentação do abdome",
                    "Aumenta a segurança corporal",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#afa498]" />
                      <span className="text-base font-light leading-relaxed text-[#6c6c6c]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-lg text-[#6c6c6c] font-light leading-relaxed">
                Você se sente mais firme, alinhada e confiante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Day-to-Day Frames Experience */}
      <section ref={dayToDaySectionRef} className="py-28 bg-white">
        <div className="container px-6 mx-auto">
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8">
                <Badge className="bg-[#3a3a3a] text-white hover:bg-[#3a3a3a] border-none px-5 py-1.5 mb-6 text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Dia a dia
                </Badge>
                <h2 className="font-brandSerif text-4xl lg:text-5xl text-[#3a3a3a] leading-[1.1] mb-8">
                  Cuidado funcional para todos os dias
                </h2>
                <p className="text-lg text-[#6c6c6c] font-light leading-relaxed text-pretty">
                  A calcinha de compressão Taiza possui benefícios que vão além da gestação e pós-parto. Ela foi
                  desenvolvida para acompanhar a mulher real: em todas as fases, todos os dias.
                </p>
              </div>

              <div className="lg:col-span-4 rounded-3xl border border-[#d2c9be]/30 bg-[#F9F7F5] p-6 space-y-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#afa498] font-bold">
                  BENEFÍCIOS
                </div>
                <div className="h-2 rounded-full bg-[#f1eeeb] overflow-hidden">
                  <div
                    className="h-full bg-[#3a3a3a] transition-all duration-300"
                    style={{ width: `${(dayToDayFrame / DAY_TO_DAY_FRAME_COUNT) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-[9px] sm:text-[10px] text-center uppercase tracking-[0.08em] sm:tracking-[0.12em]">
                  {dayToDayFrames.map((frame) => (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => setDayToDayFrame(frame.id)}
                      className={`rounded-xl px-2 py-2 whitespace-nowrap transition ${
                        dayToDayFrame === frame.id
                          ? "bg-[#3a3a3a] text-white"
                          : "bg-white text-[#6c6c6c] hover:bg-[#f1eeeb]"
                      }`}
                    >
                      {frame.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
              <div className="lg:col-span-5 flex">
                <div className="relative w-full min-h-[500px] lg:h-[500px] overflow-hidden rounded-[2rem] border border-[#e7dfd8] bg-[#f6f2ee] shadow-[0_22px_50px_-28px_rgba(58,58,58,0.45)]">
                  <img
                    src={activeDayToDayFrame.image}
                    alt={activeDayToDayFrame.alt}
                    className="absolute inset-0 w-full h-full object-cover object-[center_24%]"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/foto_0003.jpeg";
                    }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/15 to-transparent" />
                </div>
              </div>

              <div className="lg:col-span-7 min-h-[500px] bg-[#fcfbfa] p-8 md:p-10 rounded-[2.5rem] shadow-[0_48px_80px_-16px_rgba(175,164,152,0.12)] border border-[#d2c9be]/25 flex flex-col gap-8">
                <h3 className="text-sm uppercase tracking-widest font-bold text-[#3a3a3a]">
                  {dayToDayFrame}. {activeDayToDayFrame.title}
                </h3>
                <p className="text-[#6c6c6c] font-light leading-relaxed text-pretty">
                  {activeDayToDayFrame.description}
                </p>
                <ul className="space-y-4">
                  {activeDayToDayFrame.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#afa498]" />
                      <span className="text-base font-light leading-relaxed text-[#6c6c6c]">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
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
        </div>
      </section>
      {/* Authority - Modern Split Layout */}
      <section className="py-32 bg-[#f6f2ee]">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col lg:flex-row bg-white rounded-[4rem] overflow-hidden shadow-[0_48px_80px_-16px_rgba(175,164,152,0.12)] border border-[#d2c9be]/20">
            <div className="lg:w-1/2 relative min-h-[400px]">
              <img 
                src="/bella_960.webp"
                srcSet={buildWebpSrcSet("bella")}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="absolute inset-0 w-full h-full object-cover"
                alt="Especialista"
                loading="lazy"
                decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/foto_0003.jpeg";
                    }}
                  />
              <div className="absolute inset-0 bg-black/10" />
            </div>
            <div className="lg:w-1/2 p-12 lg:p-24 flex flex-col justify-center">
              <span className="text-xs uppercase tracking-[0.3em] text-[#afa498] font-bold mb-6">Expertise Pélvica</span>
              <h2 className="font-brandSerif text-3xl md:text-4xl text-[#3a3a3a] mb-8 leading-[1.15] md:leading-[1.1] break-normal [overflow-wrap:normal]">
                "A calcinha ideal não apenas aperta; ela acolhe e orienta o corpo de volta ao lugar."
              </h2>
              <p className="text-lg text-[#6c6c6c] font-light leading-relaxed mb-10">
                Como fisioterapeuta pélvica, vejo o impacto de uma recuperação segura e orientada. A calcinha pós-parto Taiza Care foi desenhada para acelerar o processo de recuperação de forma respeitosa e confortável.
              </p>
              <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-[#afa498]" />
                <span className="font-brandSerif text-xl text-[#3a3a3a]">Dra. Izabela R. Camilo, Fisioterapeuta</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-white">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col lg:flex-row bg-white rounded-[4rem] overflow-hidden shadow-[0_48px_80px_-16px_rgba(175,164,152,0.12)] border border-[#d2c9be]/20">
            <div className="lg:w-1/2 relative min-h-[400px]">
              <img
                src="/tai_960.webp"
                srcSet={buildWebpSrcSet("tai")}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="absolute inset-0 w-full h-full object-cover"
                alt="Especialista"
                loading="lazy"
                decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/foto_0002.jpeg";
                    }}
                  />
              <div className="absolute inset-0 bg-black/10" />
            </div>
            <div className="lg:w-1/2 p-12 lg:p-24 flex flex-col justify-center">
              <span className="text-xs uppercase tracking-[0.3em] text-[#afa498] font-bold mb-6">Expertise Pélvica</span>
              <h2 className="font-brandSerif text-3xl md:text-4xl text-[#3a3a3a] mb-8 leading-[1.15] md:leading-[1.1] break-normal [overflow-wrap:normal]">
                "Uma escolha errada nessa fase pode comprometer a recuperação e trazer prejuízos para o resto da vida."
              </h2>
              <p className="text-lg text-[#6c6c6c] font-light leading-relaxed mb-10">
                Recebo diversas pacientes com queixas relacionadas a cicatrização pós-parto. Muitas vezes é devido ao uso
                de calcinhas e cintas inadequadas, que possuem tecidos diferentes, compressões irregulares, costuras
                sobre a cicatriz ou compressão excessiva, que geram resultados estéticos e funcionais
                desfavoráveis.
              </p>
              <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-[#afa498]" />
                <span className="font-brandSerif text-xl text-[#3a3a3a]">Dra. Tainara B. da Mata, Fisioterapeuta</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Product Details */}
      <section className="py-32 bg-[#f6f2ee]">
        <div className="container px-6 mx-auto">
          <div className="text-center mb-24">
            <h2 className="font-brandSerif text-4xl lg:text-5xl text-[#3a3a3a] mb-6">Detalhes que Fazem a Diferença</h2>
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
              <div 
                key={i}
                className="flex items-center gap-6 p-8 rounded-3xl bg-white border border-[#d2c9be]/20 hover:shadow-xl hover:shadow-[#afa498]/5 transition-all"
              >
                <div className="w-3 h-3 rounded-full bg-[#afa498]/30" />
                <span className="text-lg text-[#3a3a3a] font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - Elegant & Minimal */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="container px-6 mx-auto relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-12">
               {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-[#afa498] fill-current" />)}
            </div>
            <div className="relative text-center">
              <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-[12rem] font-brandSerif text-[#afa498]/5 -z-10 leading-none">“</span>
              <p className="font-brandSerif text-3xl md:text-4xl text-[#3a3a3a] leading-tight mb-12 italic px-8">
                Superou minhas expectativas. Me senti segura para cuidar da minha filha sem aquela sensação de 'tudo solto' na barriga. Uma compressão confortável, sem me sentir sufocada.
              </p>
              <div className="flex flex-col items-center">
                <img
                  src="/laylla.webp"
                  alt="Laylla Legnani"
                  className="w-16 h-16 rounded-full object-cover mb-4 shadow-inner"
                  loading="lazy"
                  decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/foto_0002.jpeg";
                    }}
                  />
                <a
                  href="https://www.instagram.com/layllalegnani?igsh=MTl6bTUyejVibDdsbw=="
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#3a3a3a] hover:text-[#afa498] transition-colors"
                >
                  Laylla Legnani
                </a>
                <span className="text-sm text-[#afa498]">Mãe da Lorena</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d2c9be]/30 to-transparent" />
      </section>

      {/* Checkout Step-by-Step Preview */}
      <section ref={checkoutRef} className="py-28 bg-[#f6f2ee] scroll-mt-20">
        <div className="container px-6 mx-auto">
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div className="space-y-8 lg:sticky lg:top-28">
                <h2 className="font-brandSerif text-5xl text-[#3a3a3a] leading-[1.05]">
                  Comece sua <br /> recuperação.
                </h2>
                <p className="text-lg text-[#6c6c6c] font-light leading-relaxed max-w-xl">
                  Você está a poucos passos de escolher o cuidado certo para este momento. Preencha as etapas abaixo e
                  finalize com segurança.
                </p>
                <div className="rounded-3xl border border-[#d2c9be]/30 bg-[#F9F7F5] p-6 space-y-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#afa498] font-bold">
                    Passo {checkoutStep} de 4
                  </div>
                  <div className="h-2 rounded-full bg-[#f1eeeb] overflow-hidden">
                    <div
                      className="h-full bg-[#3a3a3a] transition-all duration-300"
                      style={{ width: `${(checkoutStep / 4) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[9px] sm:text-[10px] text-center uppercase tracking-[0.08em] sm:tracking-[0.12em]">
                    {["Tamanho", "Pagamento", "Dados", "Entrega"].map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setCheckoutStep((index + 1) as 1 | 2 | 3 | 4)}
                        className={`rounded-xl px-2 py-2 whitespace-nowrap transition ${
                          checkoutStep === index + 1
                            ? "bg-[#3a3a3a] text-white"
                            : "bg-white text-[#6c6c6c] hover:bg-[#f1eeeb]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#fcfbfa] p-8 md:p-10 rounded-[2.5rem] shadow-[0_48px_80px_-16px_rgba(175,164,152,0.12)] border border-[#d2c9be]/25">
                {checkoutStep === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-sm uppercase tracking-widest font-bold text-[#3a3a3a]">1. Tamanho</h3>
                    <p className="text-sm text-[#6c6c6c] font-light leading-relaxed">
                      <span className="font-medium text-[#3a3a3a]">Como escolher o seu:</span> Se baseie no tamanho de calcinha que utilizava antes da gestação, pois nossos modelos já são desenvolvidos pensando no ganho de peso gestacional. Por exemplo: se usava tamanho M antes da gestação, peça a calcinha de tamanho M para o pós parto! Ainda tem dúvida? Você também pode se basear pelo tamanho de calça jeans que utilizava antes da gestação.
                      <br />
                      <br />
                      <span className="font-medium text-[#3a3a3a]">Para a gestação:</span> Invista em um tamanho maior do que
                      utilizava antes da gestação, para garantir maior conforto conforme houver aumento do abdome.
                    </p>
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { sigla: "PP", num: "34" },
                        { sigla: "P", num: "36/38" },
                        { sigla: "M", num: "40/42" },
                        { sigla: "G", num: "44" },
                        { sigla: "GG", num: "46 em diante" },
                      ].map(({ sigla, num }) => (
                        <button
                          key={`step-${sigla}`}
                          onClick={() => setSelectedSize(sigla)}
                          className={`h-16 rounded-2xl border-2 transition-all flex flex-col items-center justify-center leading-tight ${
                            selectedSize === sigla
                              ? "border-[#3a3a3a] bg-[#3a3a3a] text-white"
                              : "border-[#d2c9be]/30 bg-white hover:border-[#afa498] text-[#3a3a3a]"
                          }`}
                        >
                          <span>{sigla}</span>
                          <span className="text-[11px] opacity-80">{num}</span>
                        </button>
                      ))}
                    </div>
                   
                    <div className="flex items-center justify-between rounded-2xl border border-[#d2c9be]/30 bg-[#F9F7F5] p-4">
                      <div className="text-sm text-[#3a3a3a]">Quantidade</div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="h-9 w-9 rounded-full border border-[#d2c9be]/40 bg-white text-[#3a3a3a]"
                          aria-label="Diminuir quantidade"
                        >
                          −
                        </button>
                        <div className="min-w-8 text-center text-base font-medium text-[#3a3a3a]">{quantity}</div>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                          className="h-9 w-9 rounded-full border border-[#d2c9be]/40 bg-white text-[#3a3a3a]"
                          aria-label="Aumentar quantidade"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {checkoutStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-sm uppercase tracking-widest font-bold text-[#3a3a3a]">2. Forma de pagamento</h3>
                    <div className="space-y-2 rounded-2xl border border-[#d2c9be]/20 bg-[#F9F7F5] p-4">
                      <label
                        className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition block ${
                          paymentMethod === "pix"
                            ? "border-[#3a3a3a] bg-white"
                            : "border-[#d2c9be]/30 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="pay-stepper"
                            checked={paymentMethod === "pix"}
                            onChange={() => setPaymentMethod("pix")}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-[#3a3a3a]">PIX</div>
                            <div className="text-xs text-[#6c6c6c]">Pagamento instantâneo com desconto</div>
                            <div className="mt-2 font-medium text-[#3a3a3a]">{formatBRL(productPixPriceCents)}</div>
                          </div>
                        </div>
                      </label>
                      <label
                        className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition block ${
                          paymentMethod === "card"
                            ? "border-[#3a3a3a] bg-white"
                            : "border-[#d2c9be]/30 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="pay-stepper"
                            checked={paymentMethod === "card"}
                            onChange={() => setPaymentMethod("card")}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-[#3a3a3a]">Cartão</div>
                            <div className="text-xs text-[#6c6c6c]">Parcelamento em até 3x</div>
                            <div className="mt-2 font-medium text-[#3a3a3a]">{formatBRL(productCardPriceCents)}</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {checkoutStep === 3 && (
                  <div className="space-y-5">
                    <h3 className="text-sm uppercase tracking-widest font-bold text-[#3a3a3a]">3. Dados do cliente</h3>
                    <FloatingInput
                      label="Nome completo"
                      placeholder="Seu nome"
                      value={checkoutForm.name}
                      onChange={(e) => setCheckoutForm((s) => ({ ...s, name: e.target.value }))}
                      required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FloatingInput
                        label="CPF"
                        placeholder="000.000.000-00"
                        value={checkoutForm.cpf}
                        onChange={(e) => setCheckoutForm((s) => ({ ...s, cpf: formatCpf(e.target.value) }))}
                        inputMode="numeric"
                        required
                      />
                      <FloatingInput
                        label="WhatsApp"
                        placeholder="(44) 99976-0479"
                        value={checkoutForm.phone}
                        onChange={(e) => setCheckoutForm((s) => ({ ...s, phone: e.target.value }))}
                        inputMode="tel"
                        required
                      />
                    </div>
                    <FloatingInput
                      label="Seu melhor e-mail"
                      placeholder="contato@exemplo.com"
                      value={checkoutForm.email}
                      onChange={(e) => setCheckoutForm((s) => ({ ...s, email: e.target.value }))}
                      inputMode="email"
                      required
                    />
                  </div>
                )}

                {checkoutStep === 4 && (
                  <div className="space-y-5">
                    <h3 className="text-sm uppercase tracking-widest font-bold text-[#3a3a3a]">4. Forma de entrega</h3>
                    <div className="space-y-2 rounded-2xl border border-[#d2c9be]/20 bg-[#F9F7F5] p-4">
                      <label
                        className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition block ${
                          deliveryMethod === "shipping"
                            ? "border-[#3a3a3a] bg-white"
                            : "border-[#d2c9be]/30 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="delivery-stepper"
                            checked={deliveryMethod === "shipping"}
                            onChange={() => setDeliveryMethod("shipping")}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-[#3a3a3a]">Receber em casa</div>
                            <div className="text-xs text-[#6c6c6c]">Frete calculado pelo CEP</div>
                          </div>
                        </div>
                      </label>
                      <label
                        className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition block ${
                          deliveryMethod === "pickup"
                            ? "border-[#3a3a3a] bg-white"
                            : "border-[#d2c9be]/30 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="delivery-stepper"
                            checked={deliveryMethod === "pickup"}
                            onChange={() => setDeliveryMethod("pickup")}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-[#3a3a3a]">Retirar no local</div>
                            <div className="text-xs text-[#6c6c6c]">Sem frete</div>
                          </div>
                        </div>
                      </label>
                    </div>

                    {deliveryMethod === "shipping" && (
                      <>
                        <FloatingInput
                          label="CEP de Entrega"
                          placeholder="00000-000"
                          value={checkoutForm.postalCode}
                          onChange={(e) => setCheckoutForm((s) => ({ ...s, postalCode: e.target.value }))}
                          inputMode="numeric"
                        />
                        {addressLookupLoading && (
                          <p className="text-xs text-[#6c6c6c]">Buscando endereço pelo CEP...</p>
                        )}
                        {addressLookupError && (
                          <p className="text-xs text-red-600">{addressLookupError}</p>
                        )}
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
                        {shippingError && <p className="text-sm text-red-600">{shippingError}</p>}
                        {shippingOptions.length > 0 && (
                          <div className="space-y-2 rounded-2xl border border-[#d2c9be]/20 bg-[#F9F7F5] p-4">
                            {shippingOptions.map((opt) => (
                              <label
                                key={`step-ship-${String(opt.serviceId)}`}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                                  String(selectedShippingServiceId) === String(opt.serviceId)
                                    ? "border-[#3a3a3a] bg-white"
                                    : "border-[#d2c9be]/30 bg-white/60 hover:bg-white"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="radio"
                                    name="shipping-stepper"
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
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="mt-8 space-y-5">
                  <div className="rounded-2xl border border-[#d2c9be]/20 bg-[#F9F7F5] p-5">
                    <div className="flex items-center justify-between text-xs text-[#6c6c6c] mb-1">
                      <span>Produto</span>
                      <span className="font-medium text-[#3a3a3a]">{formatBRL(productLineCents)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#6c6c6c] mb-2">
                      <span>Frete</span>
                      <span className="font-medium text-[#3a3a3a]">
                        {deliveryMethod === "pickup"
                          ? "Grátis (retirada)"
                          : shippingLoading
                            ? "Calculando..."
                            : shippingPriceCents
                              ? formatBRL(shippingPriceCents)
                              : "—"}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#d2c9be]/20 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.15em] text-[#6c6c6c]">Total</span>
                      <span className="font-brandSerif text-3xl text-[#3a3a3a]">{formatBRL(totalPriceCents)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={goToPreviousStep}
                      disabled={checkoutStep === 1}
                      className="h-12 rounded-2xl px-6 text-[#6c6c6c] border border-[#d2c9be]/30 hover:bg-[#f5f1ec]"
                    >
                      Voltar
                    </Button>
                    {checkoutStep < 4 ? (
                      <Button
                        type="button"
                        onClick={goToNextStep}
                        className="flex-1 h-14 rounded-2xl bg-[#3a3a3a] hover:bg-black text-white"
                      >
                        Continuar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                        className="flex-1 h-14 rounded-2xl bg-[#3a3a3a] hover:bg-black text-white"
                      >
                        {checkoutLoading ? "Gerando pagamento..." : "Finalizar Compra"}
                      </Button>
                    )}
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
              <div className="font-brandSerif text-3xl text-[#3a3a3a] mb-6">TAIZA CARE</div>
              <p className="max-w-xs text-sm text-[#b3b2b2] font-light leading-relaxed">
                Elevando o padrão de cuidado no pós-parto através da união entre fisioterapia pélvica e design minimalista.
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
              <FooterColumn title="Produto" links={["Pós-parto", "Tamanhos", "Tecnologia"]} />
              <FooterColumn title="Suporte" links={["Trocas", "Privacidade", "Contato"]} />
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-[#d2c9be]/10 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest text-[#b3b2b2]">
            <span>© {new Date().getFullYear()} Taiza Care</span>
            <span aria-hidden="true" className="text-[#d2c9be]">•</span>
            <a
              href="https://www.instagram.com/taizapelvica?igsh=djJuaDkxd3lldmk3"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-[#3a3a3a] hover:text-[#afa498] transition-colors"
            >
              Instagram
            </a>
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

























