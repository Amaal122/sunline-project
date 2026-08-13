"use client";

import { useSearchParams } from "next/navigation";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const FAQ_SECTIONS = [
  {
    id: "orders",
    category: "Orders",
    items: [
      {
        q: "How do I track my order?",
        a: "Once your order ships, you'll receive a confirmation with your order number. You can look up your order status anytime using your order number on our Order Confirmation page.",
      },
      {
        q: "Can I change or cancel my order after placing it?",
        a: "If your order hasn't shipped yet, contact us as soon as possible at hello@sunline.tn and we'll do our best to help. Once an order has shipped, it can no longer be changed or cancelled.",
      },
    ],
  },
  {
    id: "shipping",
    category: "Shipping",
    items: [
      {
        q: "How much does shipping cost?",
        a: "Delivery is free on all orders over 200 DT. For orders under that amount, a flat delivery fee applies at checkout.",
      },
      {
        q: "How long does delivery take?",
        a: "Orders within Tunisia typically arrive within 2-5 business days, depending on your governorate.",
      },
      {
        q: "Do you deliver across all of Tunisia?",
        a: "Yes — we deliver to all 24 governorates.",
      },
    ],
  },
  {
    id: "returns",
    category: "Returns & Exchanges",
    items: [
      {
        q: "What is your return policy?",
        a: "We accept returns within 14 days of delivery, no questions asked. Items must be unworn, unwashed, and in their original condition with tags attached.",
      },
      {
        q: "How do I start a return?",
        a: "Contact us at hello@sunline.tn with your order number and we'll walk you through the process.",
      },
      {
        q: "Can I exchange for a different size?",
        a: "Yes — reach out to us within 14 days of delivery and we'll help arrange an exchange, subject to stock availability.",
      },
    ],
  },
  {
    id: "payment",
    category: "Payment",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "We accept Cash on Delivery (COD) and online card payment at checkout.",
      },
      {
        q: "Is online payment secure?",
        a: "Yes — all online payments are processed through a secure, encrypted payment gateway. We never store your card details.",
      },
    ],
  },
  {
    id: "sizing",
    category: "Sizing",
    items: [
      {
        q: "How do I know which size to choose?",
        a: "Each product page lists available sizes based on current stock. If you're between sizes or unsure, feel free to email us at hello@sunline.tn before ordering.",
      },
      {
        q: "Do your jeans run true to size?",
        a: "Our fits are designed true to size, but each silhouette (Straight, Wide Leg, Skinny, Mom Jeans, Flare) sits slightly differently. Check the product description for fit notes.",
      },
    ],
  },
];

export default function FaqContent() {
  const searchParams = useSearchParams();
  const targetSection = searchParams.get("t");
  const defaultOpen = FAQ_SECTIONS.find((s) => s.id === targetSection)?.id;

  return (
    <>
      <section className="page-hero wrap">
        <span className="eyebrow">Help Center</span>
        <h1>FAQ, Shipping &amp; Returns</h1>
        <div className="sunline" />
        <p className="lead">Everything you need to know about ordering from SUNLINE.</p>
      </section>

      <section className="block wrap faq-wrap">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.id} id={section.id} className="faq-section">
            <h3 className="faq-category">{section.category}</h3>
            <Accordion.Root
              type="single"
              collapsible
              defaultValue={section.id === defaultOpen ? section.items[0].q : undefined}
            >
              {section.items.map((item) => (
                <Accordion.Item key={item.q} value={item.q} className="faq-item">
                  <Accordion.Header>
                    <Accordion.Trigger className="faq-trigger">
                      {item.q}
                      <ChevronDown className="faq-chevron" aria-hidden="true" />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="faq-content">
                    <p>{item.a}</p>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </div>
        ))}
      </section>
    </>
  );
}