// Estilo de ropa: test → 3 estilos recomendados, conjuntos con los colores de tu paleta y reglas de
// contraste y de corte según tu complexión y altura. Reglas habituales de asesoría de imagen, con tablas
// propias para hombre y para mujer (preguntas, estilos, siluetas y conjuntos).
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./color.js") : root.FA.color);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).estilo = api;
})(typeof self !== "undefined" ? self : this, function (color) {
  "use strict";

  const QUIZ = [
    { id: "dia", q: "Tu día a día:", options: [
      { v: "formal", label: "Oficina formal o reuniones" }, { v: "creativo", label: "Oficina informal o trabajo creativo" },
      { v: "activo", label: "Trabajo físico, calle o estudio" }, { v: "casa", label: "Trabajo desde casa" }] },
    { id: "personalidad", q: "Quieres que tu ropa…", options: [
      { v: "discreto", label: "No llame la atención, pero que se vea cuidada" }, { v: "equilibrado", label: "Tenga algún detalle" },
      { v: "atrevido", label: "Se note" }] },
    { id: "objetivo", q: "Lo que más quieres transmitir:", options: [
      { v: "elegante", label: "Elegancia y confianza" }, { v: "moderno", label: "Que voy a la moda / más joven" },
      { v: "varonil", label: "Fuerza, aspecto más robusto" }, { v: "comodo", label: "Comodidad sin verme descuidado" }] },
    { id: "complexion", q: "Tu complexión:", options: [
      { v: "delgado", label: "Delgado" }, { v: "atletico", label: "Atlético / hombros anchos" }, { v: "robusto", label: "Robusto o con barriga" }] },
    { id: "altura", q: "Tu altura:", options: [
      { v: "bajo", label: "Menos de 1,70 m" }, { v: "medio", label: "1,70–1,85 m" }, { v: "alto", label: "Más de 1,85 m" }] },
  ];

  // fit: puntos por respuesta. outfits: prendas con un "rol" de color de tu paleta (ver roles()).
  const STYLES = {
    clasico: { name: "Clásico elegante", desc: "Traje o americana bien entallada, camisa lisa, zapato de piel. Atemporal y transmite confianza.",
      keys: ["Americana azul marino o gris", "Camisa blanca o celeste", "Pantalón de vestir", "Zapato oxford o derby", "Cinturón a juego con el zapato"],
      avoid: ["Tallas grandes", "Corbatas con estampado de dibujos", "Zapatos de punta cuadrada"],
      fit: { dia: { formal: 3, creativo: 1 }, personalidad: { discreto: 2, equilibrado: 1 }, objetivo: { elegante: 3 } },
      outfits: [
        { label: "Reunión importante", top: "light", outer: "dark", outerType: "blazer", bottom: "dark", shoes: "shoe", shoeType: "dress", tie: "accent" },
        { label: "Cena", top: "accent2", outer: "mid", outerType: "blazer", bottom: "dark", shoes: "shoe", shoeType: "dress" }] },
    smart: { name: "Smart casual", desc: "Americana desestructurada o sobrecamisa con chinos y camiseta o polo. Arreglado sin corbata: la apuesta más versátil.",
      keys: ["Americana sin forro o sobrecamisa", "Chinos", "Polo de punto o camiseta lisa de calidad", "Mocasines o zapatillas de piel blancas", "Jersey de cuello redondo"],
      avoid: ["Camisetas con logos grandes", "Zapatillas de deporte gastadas", "Bermudas en contextos de trabajo"],
      fit: { dia: { creativo: 3, formal: 1, casa: 1 }, personalidad: { equilibrado: 2, discreto: 1 }, objetivo: { elegante: 2, moderno: 1, comodo: 1 } },
      outfits: [
        { label: "Oficina sin corbata", top: "light", outer: "mid", outerType: "blazer", bottom: "mid", shoes: "shoe", shoeType: "dress" },
        { label: "Cita", top: "accent", outer: "dark", outerType: "overshirt", bottom: "dark", shoes: "light", shoeType: "sneaker" }] },
    minimal: { name: "Minimalista", desc: "Pocas prendas lisas, cortes limpios y colores neutros de tu paleta. Se ve caro con poco dinero.",
      keys: ["Camisetas lisas gruesas", "Pantalón recto oscuro", "Zapatillas blancas limpias", "Chaqueta harrington o bomber lisa", "Jersey fino de punto"],
      avoid: ["Estampados", "Más de 3 colores a la vez", "Logos visibles"],
      fit: { personalidad: { discreto: 3 }, objetivo: { moderno: 1, comodo: 2, elegante: 1 }, dia: { casa: 2, creativo: 1 } },
      outfits: [
        { label: "Diario", top: "light", bottom: "dark", shoes: "light", shoeType: "sneaker" },
        { label: "Tarde", top: "dark", outer: "mid", outerType: "jacket", bottom: "dark", shoes: "light", shoeType: "sneaker" }] },
    urbano: { name: "Urbano / streetwear", desc: "Sudaderas, prendas amplias, cargo y zapatillas llamativas. Moderno y relajado.",
      keys: ["Sudadera con capucha de calidad", "Cargo o jogger", "Zapatillas de diseño", "Camiseta oversize", "Gorra lisa"],
      avoid: ["Todo oversize a la vez si eres bajo", "Mezclar demasiados logos"],
      fit: { personalidad: { atrevido: 3, equilibrado: 1 }, objetivo: { moderno: 3, comodo: 1 }, dia: { activo: 2, casa: 1 } },
      outfits: [
        { label: "Fin de semana", top: "light", outer: "accent", outerType: "hoodie", bottom: "dark", shoes: "light", shoeType: "sneaker" },
        { label: "Salir", top: "dark", outer: "accent2", outerType: "jacket", bottom: "mid", shoes: "accent", shoeType: "sneaker" }] },
    rugged: { name: "Rugged / workwear", desc: "Vaqueros, botas, sobrecamisa de franela, chaqueta de trabajo o de cuero. Robusto y varonil.",
      keys: ["Vaquero oscuro recto", "Botas de piel", "Camisa de franela u oxford", "Chaqueta de trabajo o de cuero", "Camiseta henley"],
      avoid: ["Vaqueros rotos", "Ropa demasiado ajustada"],
      fit: { objetivo: { varonil: 3, comodo: 1 }, dia: { activo: 3, creativo: 1 }, personalidad: { equilibrado: 1 } },
      outfits: [
        { label: "Diario", top: "accent", outer: "deep", outerType: "overshirt", bottom: "denim", bottomType: "jeans", shoes: "shoe", shoeType: "boot" },
        { label: "Frío", top: "light", outer: "dark", outerType: "jacket", bottom: "denim", bottomType: "jeans", shoes: "shoe", shoeType: "boot" }] },
    preppy: { name: "Preppy / clásico informal", desc: "Polos, camisas oxford, jerséis de punto y chinos. Pulcro, cercano y elegante a la vez.",
      keys: ["Camisa oxford", "Polo de piqué", "Jersey de pico o cuello redondo", "Chinos claros", "Náuticos o mocasines"],
      avoid: ["Logos grandes", "Tallas holgadas"],
      fit: { objetivo: { elegante: 2, comodo: 1 }, personalidad: { equilibrado: 2, discreto: 1 }, dia: { creativo: 2, formal: 1 } },
      outfits: [
        { label: "Fin de semana", top: "accent", bottom: "stone", shoes: "shoe", shoeType: "dress" },
        { label: "Entretiempo", top: "accent2", outer: "dark", outerType: "overshirt", bottom: "stone", shoes: "shoe", shoeType: "dress" }] },
    athleisure: { name: "Deportivo cuidado", desc: "Prendas técnicas y de punto, joggers entallados y zapatillas limpias. Cómodo pero intencional.",
      keys: ["Jogger entallado de punto", "Sudadera lisa sin capucha", "Camiseta técnica lisa", "Zapatillas de running limpias", "Chaqueta ligera"],
      avoid: ["Ropa del gimnasio sudada o vieja", "Chándal completo de brillo"],
      fit: { objetivo: { comodo: 3, moderno: 1 }, dia: { casa: 2, activo: 2 }, personalidad: { discreto: 1, equilibrado: 1 } },
      outfits: [
        { label: "Recados", top: "mid", bottom: "dark", shoes: "light", shoeType: "sneaker" },
        { label: "Viaje", top: "light", outer: "dark", outerType: "jacket", bottom: "dark", shoes: "accent", shoeType: "sneaker" }] },
  };

  const QUIZ_MUJER = [
    { id: "dia", q: "Tu día a día:", options: [
      { v: "formal", label: "Oficina formal o reuniones" }, { v: "creativo", label: "Oficina informal o trabajo creativo" },
      { v: "activo", label: "Trabajo físico, calle o estudio" }, { v: "casa", label: "Trabajo desde casa" }] },
    { id: "personalidad", q: "Quieres que tu ropa…", options: [
      { v: "discreto", label: "No llame la atención, pero que se vea cuidada" }, { v: "equilibrado", label: "Tenga algún detalle" },
      { v: "atrevido", label: "Se note" }] },
    { id: "objetivo", q: "Lo que más quieres transmitir:", options: [
      { v: "elegante", label: "Elegancia y confianza" }, { v: "moderno", label: "Que voy a la moda / más joven" },
      { v: "femenino", label: "Feminidad y delicadeza" }, { v: "comodo", label: "Comodidad sin verme descuidada" }] },
    { id: "complexion", q: "Tu silueta:", options: [
      { v: "reloj", label: "Reloj de arena: hombros y cadera parecidos, cintura marcada" },
      { v: "pera", label: "Pera: cadera más ancha que los hombros" },
      { v: "triangulo", label: "Triángulo invertido: hombros más anchos que la cadera" },
      { v: "rectangulo", label: "Rectángulo: hombros, cintura y cadera parecidos" },
      { v: "manzana", label: "Manzana: más volumen en la zona media" }] },
    { id: "altura", q: "Tu altura:", options: [
      { v: "bajo", label: "Menos de 1,60 m" }, { v: "medio", label: "1,60–1,72 m" }, { v: "alto", label: "Más de 1,72 m" }] },
  ];

  const STYLES_MUJER = {
    clasico: { name: "Clásico elegante", desc: "Blazer entallado, blusa lisa, pantalón de pinzas o falda lápiz y zapato de salón. Atemporal y transmite confianza.",
      keys: ["Blazer azul marino, negro o camel", "Blusa de seda o camisa blanca", "Pantalón de pinzas o falda lápiz", "Zapato de salón o mocasín", "Bolso estructurado"],
      avoid: ["Tallas grandes que escondan la figura", "Demasiados accesorios a la vez", "Tejidos que se arrugan o brillan"],
      fit: { dia: { formal: 3, creativo: 1 }, personalidad: { discreto: 2, equilibrado: 1 }, objetivo: { elegante: 3 } },
      outfits: [
        { label: "Reunión importante", top: "light", outer: "dark", outerType: "blazer", bottom: "dark", bottomType: "skirt", shoes: "shoe", shoeType: "heel" },
        { label: "Cena", top: "accent2", bottom: "accent2", bottomType: "midi", shoes: "dark", shoeType: "heel" }] },
    smart: { name: "Smart casual", desc: "Blazer sobre camiseta, vaquero recto o pantalón ancho y mocasines o bailarinas. Arreglada sin esfuerzo: la apuesta más versátil.",
      keys: ["Blazer sin forro", "Camiseta lisa de calidad o top de punto", "Vaquero recto o pantalón ancho", "Mocasines, bailarinas o zapatillas de piel blancas", "Jersey fino de punto"],
      avoid: ["Camisetas con logos grandes", "Zapatillas de deporte gastadas", "Ropa de playa en contextos de trabajo"],
      fit: { dia: { creativo: 3, formal: 1, casa: 1 }, personalidad: { equilibrado: 2, discreto: 1 }, objetivo: { elegante: 2, moderno: 1, comodo: 1 } },
      outfits: [
        { label: "Oficina", top: "light", outer: "mid", outerType: "blazer", bottom: "dark", shoes: "shoe", shoeType: "flat" },
        { label: "Cita", top: "accent", outer: "dark", outerType: "jacket", bottom: "denim", bottomType: "jeans", shoes: "dark", shoeType: "heel" }] },
    minimal: { name: "Minimalista", desc: "Pocas prendas lisas, cortes limpios y colores neutros de tu paleta. Se ve caro con poco dinero.",
      keys: ["Camisetas y tops lisos", "Pantalón recto o falda midi lisa", "Zapatillas blancas limpias o bailarinas", "Gabardina o abrigo recto", "Jersey fino de punto"],
      avoid: ["Estampados", "Más de 3 colores a la vez", "Logos visibles"],
      fit: { personalidad: { discreto: 3 }, objetivo: { moderno: 1, comodo: 2, elegante: 1 }, dia: { casa: 2, creativo: 1 } },
      outfits: [
        { label: "Diario", top: "light", bottom: "dark", shoes: "light", shoeType: "sneaker" },
        { label: "Tarde", top: "dark", bottom: "stone", bottomType: "midi", shoes: "dark", shoeType: "flat" }] },
    romantico: { name: "Romántico / femenino", desc: "Vestidos y faldas fluidas, blusas con detalle (lazada, volante) y estampados pequeños. Suave y delicado.",
      keys: ["Vestido midi fluido", "Blusa con lazada o volante", "Falda plisada o de vuelo", "Estampado floral pequeño o lunares", "Bailarinas o sandalias finas"],
      avoid: ["Exceso de volantes y lazos a la vez", "Estampados grandes si eres menuda"],
      fit: { objetivo: { femenino: 3, elegante: 1 }, personalidad: { equilibrado: 2, discreto: 1 }, dia: { creativo: 1, casa: 1 } },
      outfits: [
        { label: "Fin de semana", top: "soft", bottom: "soft", bottomType: "midi", shoes: "light", shoeType: "flat" },
        { label: "Evento", top: "accent", bottom: "accent", bottomType: "skirt", shoes: "shoe", shoeType: "heel" }] },
    urbano: { name: "Urbano / streetwear", desc: "Sudaderas, prendas amplias, cargo y zapatillas llamativas. Moderno y relajado.",
      keys: ["Sudadera con capucha de calidad", "Cargo o vaquero ancho", "Zapatillas de diseño", "Camiseta oversize o top corto", "Cazadora bomber"],
      avoid: ["Todo oversize a la vez si eres bajita", "Mezclar demasiados logos"],
      fit: { personalidad: { atrevido: 3, equilibrado: 1 }, objetivo: { moderno: 3, comodo: 1 }, dia: { activo: 2, casa: 1 } },
      outfits: [
        { label: "Fin de semana", top: "light", outer: "accent", outerType: "hoodie", bottom: "dark", shoes: "light", shoeType: "sneaker" },
        { label: "Salir", top: "dark", outer: "accent2", outerType: "jacket", bottom: "denim", bottomType: "jeans", shoes: "accent", shoeType: "sneaker" }] },
    boho: { name: "Bohemio", desc: "Prendas fluidas, faldas largas, texturas naturales (lino, ante, crochet) y botines. Libre y con personalidad.",
      keys: ["Falda o vestido largo fluido", "Blusa amplia de algodón o lino", "Chaleco o chaqueta de ante", "Botines o sandalias planas", "Accesorios de materiales naturales"],
      avoid: ["Todo holgado de pies a cabeza sin marcar nada", "Demasiados flecos a la vez"],
      fit: { personalidad: { atrevido: 2, equilibrado: 1 }, objetivo: { femenino: 1, comodo: 2, moderno: 1 }, dia: { creativo: 2, casa: 1 } },
      outfits: [
        { label: "Diario", top: "light", outer: "deep", outerType: "jacket", bottom: "accent", bottomType: "midi", shoes: "shoe", shoeType: "boot" },
        { label: "Verano", top: "accent2", bottom: "accent2", bottomType: "midi", shoes: "stone", shoeType: "flat" }] },
    athleisure: { name: "Deportivo cuidado", desc: "Prendas técnicas y de punto, leggings o joggers y zapatillas limpias. Cómodo pero intencional.",
      keys: ["Leggings o jogger de punto", "Sudadera lisa sin capucha", "Top o camiseta técnica lisa", "Zapatillas de running limpias", "Chaqueta ligera"],
      avoid: ["Ropa del gimnasio vieja o gastada", "Chándal completo de brillo"],
      fit: { objetivo: { comodo: 3, moderno: 1 }, dia: { casa: 2, activo: 2 }, personalidad: { discreto: 1, equilibrado: 1 } },
      outfits: [
        { label: "Recados", top: "mid", bottom: "dark", shoes: "light", shoeType: "sneaker" },
        { label: "Viaje", top: "light", outer: "dark", outerType: "jacket", bottom: "dark", shoes: "accent", shoeType: "sneaker" }] },
  };

  const BODY_TIPS_MUJER = {
    reloj: ["Marca la cintura: cinturones, vestidos cruzados y prendas entalladas.", "Evita prendas rectas y holgadas que escondan la cintura."],
    pera: ["Lleva la atención arriba: escote barco, hombros con detalle y colores claros arriba.", "Faldas en A y pantalón recto o acampanado; tonos oscuros abajo."],
    triangulo: ["Da volumen abajo: faldas con vuelo, pantalón ancho o palazzo.", "Escote en V y tirantes finos; evita hombreras y mangas abullonadas."],
    rectangulo: ["Crea cintura: cinturones, peplum y chaquetas entalladas.", "Capas y texturas para dar curvas; los vestidos cruzados te favorecen."],
    manzana: ["Escote en V y prendas que caigan sin ceñir la cintura (corte imperio, túnica).", "Pantalón recto y muestra piernas; tejidos fluidos, no rígidos."],
  };
  const HEIGHT_TIPS_MUJER = {
    bajo: ["Monocromo o colores cercanos de pies a cabeza alargan.", "Tiro alto, largos al tobillo y faldas por encima o justo debajo de la rodilla.", "Evita faldas largas muy voluminosas y abrigos largos y anchos."],
    medio: [],
    alto: ["Te quedan las faldas largas, los pantalones anchos y los contrastes arriba/abajo.", "Cinturones y capas cortan la figura a tu favor."],
  };

  const BODY_TIPS = {
    delgado: ["Capas (camisa + sobrecamisa, jersey sobre camisa) para dar volumen.", "Tejidos con textura: punto grueso, franela, pana.", "Talla justa: lo holgado te hace ver más delgado."],
    atletico: ["Entallado pero no apretado: que la tela no tire en hombros ni brazos.", "Cuello en V o henley realzan los hombros.", "Pantalón recto o slim que equilibre las piernas con el torso."],
    robusto: ["Colores oscuros o un mismo tono arriba alargan la figura.", "Americana o sobrecamisa abierta crea una línea vertical.", "Ni ajustado ni muy holgado: talla justa, telas con caída (no rígidas ni brillantes)."],
  };
  const HEIGHT_TIPS = {
    bajo: ["Monocromo o colores cercanos de pies a cabeza alargan.", "Pantalón sin arrugas sobre el zapato (sin quiebre).", "Chaquetas cortas que no tapen la cadera."],
    medio: [],
    alto: ["Puedes cortar la figura con contrastes arriba/abajo y capas.", "Pantalón con vuelta o chaquetas más largas te quedan bien."],
  };

  /**
   * Colores de la paleta asignados a "roles": light/stone/dark/shoe/mid (neutros), deep/soft (mejores extremos),
   * accent/accent2 (mejores con más color), denim (azul de la paleta o vaquero estándar).
   */
  function roles(seasonId) {
    const s = color.SEASONS[seasonId];
    const lab = (hex) => color.hexToLab(hex);
    const byL = (list) => [...list].sort((a, b) => lab(a)[0] - lab(b)[0]);
    const n = byL(s.neutrals), b = byL(s.best);
    // acentos: los más vivos de luminosidad media (un amarillo limón o un verde neón son difíciles de llevar)
    const mids = s.best.filter((h) => lab(h)[0] >= 30 && lab(h)[0] <= 68);
    const accents = (mids.length >= 2 ? mids : [...s.best]).sort((x, y) => color.chroma(lab(y)) - color.chroma(lab(x)));
    const blues = s.best.filter((h) => { const hu = color.hue(lab(h)); return hu > 230 && hu < 300 && lab(h)[0] < 60; });
    return {
      light: n[n.length - 1], stone: n[n.length - 2], dark: n[0], shoe: n[1], mid: n[Math.floor(n.length / 2)],
      deep: b[0], soft: b[b.length - 1], accent: accents[0], accent2: accents[1] === accents[0] ? accents[2] : accents[1],
      denim: blues[0] || "#2E4A6B",
    };
  }

  function contrastTip(level, sexo) {
    if (level === "Alto") return `Tu contraste es alto: combina claro con oscuro (${sexo === "mujer" ? "blusa blanca" : "camisa blanca"} con azul marino, negro con gris claro). Los conjuntos de un solo tono medio te apagan.`;
    if (level === "Bajo") return "Tu contraste es bajo: combina colores cercanos (beige con camel, gris con azul grisáceo). El blanco con negro te “come”.";
    return "Tu contraste es medio: un nivel de contraste moderado (azul medio con beige, gris con burdeos) es lo que mejor te va.";
  }

  /**
   * @param {object} answers  respuestas del test
   * @param {string} seasonId  estación (de color.analyze) para pintar los conjuntos
   * @param {string|null} contrast  "Alto" | "Medio" | "Bajo" | null
   */
  /** Preguntas del test según el sexo. */
  const quiz = (sexo) => (sexo === "mujer" ? QUIZ_MUJER : QUIZ);

  function recommend(answers = {}, seasonId = "otono-suave", contrast = null, sexo = "hombre") {
    const fem = sexo === "mujer", table = fem ? STYLES_MUJER : STYLES;
    const ranked = Object.entries(table).map(([id, s]) => {
      let score = 0;
      for (const [q, t] of Object.entries(s.fit)) score += t[answers[q]] || 0;
      // corrección por tipo físico: lo muy holgado no favorece al bajo ni al robusto
      if (id === "urbano" && (answers.altura === "bajo" || answers.complexion === "robusto" || answers.complexion === "manzana")) score -= 1;
      if (id === "rugged" && answers.complexion === "delgado") score += 1;
      if (id === "boho" && answers.altura === "bajo") score -= 1;
      return { id, score };
    }).sort((a, b) => b.score - a.score);
    const r = roles(seasonId);
    const top = ranked.slice(0, 3).map(({ id, score }) => {
      const s = table[id];
      return {
        id, name: s.name, desc: s.desc, keys: s.keys, avoid: s.avoid, score,
        outfits: s.outfits.map((o) => ({
          label: o.label, top: r[o.top], outer: o.outer ? r[o.outer] : undefined, outerType: o.outerType,
          bottom: r[o.bottom], bottomType: o.bottomType, shoes: r[o.shoes], shoeType: o.shoeType, tie: o.tie ? r[o.tie] : undefined,
          fem: fem || undefined,
        })),
      };
    });
    const body = fem ? BODY_TIPS_MUJER : BODY_TIPS, height = fem ? HEIGHT_TIPS_MUJER : HEIGHT_TIPS;
    const tips = [contrastTip(contrast, sexo), ...(body[answers.complexion] || []), ...(height[answers.altura] || [])];
    return { styles: top, tips, roles: r, sexo: fem ? "mujer" : "hombre" };
  }

  return { QUIZ, QUIZ_MUJER, STYLES, STYLES_MUJER, quiz, roles, recommend, contrastTip };
});
