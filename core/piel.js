// Skincare con evidencia (D-17): test → rutina de mañana y noche. Cada ingrediente lleva nivel de
// evidencia, fuente y ejemplos de producto. No es consejo médico: lo grave va al dermatólogo.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).piel = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // A = ensayos aleatorizados o revisiones sistemáticas consistentes. B = ensayos pequeños, evidencia
  // de baja calidad o consenso de expertos. C = casi sin estudios en personas.
  const LEVELS = {
    A: { label: "Evidencia fuerte", desc: "Varios ensayos aleatorizados o revisiones sistemáticas coinciden." },
    B: { label: "Evidencia moderada", desc: "Ensayos pequeños, de calidad baja o consenso de dermatólogos." },
    C: { label: "Evidencia débil", desc: "Casi no hay estudios en personas; no merece tu dinero." },
  };

  const SOURCES = {
    hughes2013: { cite: "Hughes MCB et al. Sunscreen and prevention of skin aging: a randomized trial. Ann Intern Med. 2013;158(11):781-90.", url: "https://doi.org/10.7326/0003-4819-158-11-201306040-00002",
      finding: "903 adultos durante 4,5 años: quienes usaron protector a diario envejecieron menos la piel que quienes lo usaban a veces. El betacaroteno oral no tuvo efecto." },
    tretinoina2022: { cite: "Topical tretinoin for treating photoaging: a systematic review of randomized controlled trials. Int J Womens Dermatol. 2022.", url: "https://pubmed.ncbi.nlm.nih.gov/35620028/",
      finding: "Los 7 ensayos revisados encuentran mejora de arrugas, manchas y tono apagado." },
    acne2024: { cite: "Efficacy of topical treatments in the management of mild-to-moderate acne vulgaris: a systematic review. 2024.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11081083/",
      finding: "Los retinoides (tretinoína, adapaleno) mejoran granos y puntos negros; el azelaico reduce ambos tipos de lesión; la niacinamida bajó el sebo en un ensayo pequeño." },
    cochrane2020: { cite: "Liu H et al. Topical azelaic acid, salicylic acid, nicotinamide, sulphur, zinc and fruit acid (AHA) for acne. Cochrane Database Syst Rev. 2020.", url: "https://pubmed.ncbi.nlm.nih.gov/32356369/",
      finding: "El azelaico probablemente funciona algo peor que el peróxido de benzoilo y parecido a la tretinoína; para salicílico y niacinamida la evidencia es de baja calidad." },
    wang2024: { cite: "Wang et al. Cosmeceuticals for antiaging: a systematic review of safety and efficacy. Arch Dermatol Res. 2024.", url: "https://doi.org/10.1007/s00403-024-02908-2",
      finding: "32 estudios (20 aleatorizados): retinol y vitamina C reciben grado A de recomendación antiedad; factores de crecimiento, bakuchiol y otros, grado C o sin datos suficientes." },
    bissett2005: { cite: "Bissett DL et al. Niacinamide: a B vitamin that improves aging facial skin appearance. Dermatol Surg. 2005;31(7 Pt 2):860-5.", url: "https://pubmed.ncbi.nlm.nih.gov/16029679/",
      finding: "50 mujeres, media cara con niacinamida 5 % y media sin ella durante 12 semanas: mejor tono y menos manchas. Estudio financiado por un fabricante." },
    delphi: { cite: "Skincare ingredients recommended by cosmetic dermatologists: a Delphi consensus study.", url: "https://digitalscholar.lsuhsc.edu/som_facpubs/3805",
      finding: "Dermatólogos cosméticos coinciden en 23 ingredientes, entre ellos azelaico, niacinamida, retinoides y protector mineral. Parte es opinión de expertos." },
  };

  const INGREDIENTS = {
    protector: { name: "Protector solar FPS 30–50, amplio espectro", level: "A", sources: ["hughes2013"],
      what: "Frena arrugas, manchas y flacidez causadas por el sol. Lo más rentable de toda la rutina.",
      when: "Previene desde el primer día; el efecto se ve en años.",
      how: "Cada mañana, dos dedos de producto en cara y cuello; repetir si estás al sol más de 2 h.",
      caution: "Si te salen granos, busca uno en fluido o gel “oil free” o “no comedogénico”.",
      products: ["La Roche-Posay Anthelios UVMune 400 (fluido)", "ISDIN Fotoprotector Fusion Water", "Eucerin Sun Oil Control (piel grasa)", "Neutrogena Ultra Sheer"] },
    limpiador: { name: "Limpiador suave", level: "B", sources: ["delphi"],
      what: "Quita grasa, sudor y protector sin romper la barrera de la piel. No hace milagros: solo prepara.",
      when: "Inmediato (piel más limpia).", how: "Noche siempre; mañana opcional si tienes piel seca (basta agua).",
      caution: "Evita jabón de manos o de cuerpo en la cara: reseca e irrita.",
      products: { grasa: ["CeraVe Foaming Cleanser", "La Roche-Posay Effaclar Gel"], seca: ["CeraVe Hydrating Cleanser", "Cetaphil Gentle Skin Cleanser"], default: ["CeraVe Hydrating Cleanser", "Cetaphil Gentle Skin Cleanser"] } },
    hidratante: { name: "Hidratante con ceramidas o glicerina", level: "B", sources: ["delphi"],
      what: "Repara la barrera de la piel, calma la tirantez y hace que toleres mejor los activos (retinoides, ácidos).",
      when: "Días.", how: "Mañana y noche, después de los activos.",
      caution: "Piel grasa: en gel o loción ligera, no crema espesa.",
      products: { grasa: ["CeraVe PM Facial Moisturizing Lotion", "Neutrogena Hydro Boost Water Gel"], seca: ["CeraVe Moisturising Cream", "Vanicream Moisturizing Cream"], default: ["CeraVe PM Facial Moisturizing Lotion", "Cetaphil Daily Hydrating Lotion"] } },
    adapaleno: { name: "Adapaleno 0,1 % (retinoide)", level: "A", sources: ["acne2024"],
      what: "Destapa los poros: reduce granos y puntos negros y previene que salgan nuevos. También mejora algo la textura.",
      when: "8–12 semanas. Las primeras 2–4 puede haber más granos (“purga”): es normal.",
      how: "Noche, una capa fina sobre la piel seca, 3 noches por semana y subir a diario si no irrita.",
      caution: "Irrita al principio (rojez, descamación): usa hidratante y protector. No en embarazo.",
      products: ["Differin Gel (adapaleno 0,1 %)", "La Roche-Posay Effaclar Adapalene Gel 0,1 %"] },
    tretinoina: { name: "Tretinoína 0,025–0,05 % (receta)", level: "A", sources: ["tretinoina2022"],
      what: "El antiedad con más ensayos: mejora arrugas finas, manchas y tono apagado; también trata el acné.",
      when: "3–6 meses para notar arrugas y manchas.",
      how: "Noche, del tamaño de un guisante para toda la cara, empezando 2–3 noches por semana.",
      caution: "Necesita receta en muchos países: pídesela a un dermatólogo. Irrita al empezar. No en embarazo. No la mezcles el mismo día con ácidos exfoliantes al principio.",
      products: ["Retin-A / genéricos de tretinoína (con receta)"] },
    retinol: { name: "Retinol 0,3–1 %", level: "A", sources: ["wang2024"],
      what: "Versión de venta libre y más suave de la tretinoína: mejora arrugas finas y textura, más despacio.",
      when: "3–6 meses.", how: "Noche, 2–3 por semana al principio, después de limpiar y antes del hidratante.",
      caution: "No lo combines con adapaleno ni tretinoína (es lo mismo, más débil). Algo de irritación es normal.",
      products: ["CeraVe Resurfacing Retinol Serum", "The Ordinary Retinol 0.5% in Squalane", "La Roche-Posay Retinol B3 Serum"] },
    peroxido: { name: "Peróxido de benzoilo 2,5–5 %", level: "A", sources: ["cochrane2020", "acne2024"],
      what: "Mata la bacteria del acné y baja los granos inflamados. Barato y muy probado.",
      when: "4–6 semanas.", how: "En limpiador: déjalo 1–2 minutos y aclara. Puede ir de mañana.",
      caution: "Decolora toallas y camisetas. Puede resecar: empieza con 2,5–4 %.",
      products: ["PanOxyl Acne Creamy Wash 4 %", "CeraVe Acne Foaming Cream Cleanser (4 %)"] },
    azelaico: { name: "Ácido azelaico 10–20 %", level: "B", sources: ["cochrane2020", "acne2024", "delphi"],
      what: "Baja granos, rojeces y manchas oscuras que dejan los granos. Muy bien tolerado: buena opción si tu piel es sensible.",
      when: "8–12 semanas.", how: "Mañana o noche, capa fina antes del hidratante.",
      caution: "Puede picar unos minutos las primeras semanas.",
      products: ["The Ordinary Azelaic Acid Suspension 10%", "Paula's Choice 10% Azelaic Acid Booster", "Finacea 15 % (receta en algunos países)"] },
    niacinamida: { name: "Niacinamida 4–5 %", level: "B", sources: ["bissett2005", "acne2024", "cochrane2020"],
      what: "Ayuda con el brillo (sebo), las manchas y la barrera. Suave y fácil de combinar con todo.",
      when: "8–12 semanas.", how: "Mañana y/o noche antes del hidratante (muchos hidratantes ya la llevan).",
      caution: "Más concentración (10 %) no está demostrado que sea mejor y a algunos les irrita.",
      products: ["CeraVe PM Facial Moisturizing Lotion (4 %)", "La Roche-Posay Effaclar Duo+", "The Ordinary Niacinamide 10% + Zinc 1%"] },
    salicilico: { name: "Ácido salicílico 0,5–2 % (BHA)", level: "B", sources: ["cochrane2020"],
      what: "Exfolia dentro del poro: puntos negros, poros marcados y pelos enquistados tras afeitarte.",
      when: "4–8 semanas.", how: "Noche, 2–3 veces por semana (en días sin retinoide si irrita).",
      caution: "La evidencia para acné es de baja calidad: úsalo de apoyo, no como base.",
      products: ["Paula's Choice Skin Perfecting 2% BHA Liquid", "CeraVe SA Smoothing Cleanser"] },
    vitc: { name: "Vitamina C (ácido L-ascórbico 10–20 %)", level: "A", sources: ["wang2024"],
      what: "Antioxidante: refuerza al protector contra el sol, aclara manchas y da luminosidad.",
      when: "8–12 semanas.", how: "Mañana, antes del protector.",
      caution: "Se oxida (si se pone naranja oscuro, tírala). Puede picar en piel sensible.",
      products: ["La Roche-Posay Pure Vitamin C10", "Timeless 20% Vitamin C + E Ferulic Acid", "SkinCeuticals C E Ferulic (caro)"] },
  };

  // Dinero mal gastado: o no hay estudios, o los que hay dicen que no.
  const SKIP = [
    { name: "Colágeno en crema", why: "La molécula es demasiado grande para entrar en la piel: hidrata, pero no “repone colágeno”. Lo que sí estimula colágeno: retinoides y protector solar." },
    { name: "Betacaroteno en pastillas para la piel", why: "En el ensayo de Hughes (2013) no frenó el envejecimiento de la piel.", source: "hughes2013" },
    { name: "Factores de crecimiento, bakuchiol y similares (como antiedad principal)", why: "Grado C o sin datos suficientes en la revisión de 2024. Si quieres antiedad, retinol o tretinoína.", source: "wang2024" },
    { name: "Mascarillas de carbón, “detox” y exfoliantes de grano", why: "No hay ensayos que muestren beneficio; los gránulos pueden irritar." },
  ];

  const QUIZ = [
    { id: "tipo", q: "A media tarde, sin ponerte nada, tu cara está…", options: [
      { v: "grasa", label: "Brillante por todas partes" }, { v: "mixta", label: "Brillante en frente y nariz, normal en mejillas" },
      { v: "normal", label: "Bien, ni brillo ni tirantez" }, { v: "seca", label: "Tirante o con pielecitas" }] },
    { id: "sensible", q: "¿Se te irrita la piel con facilidad (pica, se enrojece con productos nuevos)?", options: [
      { v: "si", label: "Sí" }, { v: "no", label: "No" }] },
    { id: "edad", q: "Tu edad:", options: [
      { v: "<25", label: "Menos de 25" }, { v: "25-35", label: "25–35" }, { v: "35-45", label: "35–45" }, { v: "45+", label: "Más de 45" }] },
    { id: "receta", q: "¿Estarías dispuesto a ir al dermatólogo por una crema con receta (lo más eficaz)?", options: [
      { v: "si", label: "Sí" }, { v: "no", label: "Prefiero solo productos de farmacia" }] },
  ];

  const CONCERNS = [
    { id: "acne", label: "Granos" }, { id: "puntos", label: "Puntos negros y poros" }, { id: "manchas", label: "Manchas o marcas de granos" },
    { id: "arrugas", label: "Arrugas / verme mayor" }, { id: "brillo", label: "Brillo y grasa" }, { id: "rojez", label: "Rojeces" },
    { id: "afeitado", label: "Irritación o pelos enquistados al afeitar" }, { id: "apagada", label: "Piel apagada o cansada" },
  ];

  function step(id, tipo) {
    const ing = INGREDIENTS[id];
    const products = Array.isArray(ing.products) ? ing.products : ing.products[tipo === "grasa" || tipo === "mixta" ? "grasa" : tipo === "seca" ? "seca" : "default"];
    return { id, ...ing, products, sources: ing.sources.map((s) => ({ id: s, ...SOURCES[s] })) };
  }

  /**
   * Rutina a partir del test.
   * @param {{tipo?:string, sensible?:string, edad?:string, receta?:string}} a
   * @param {string[]} concerns  ids de CONCERNS
   */
  function routine(a = {}, concerns = []) {
    const has = (c) => concerns.includes(c);
    const tipo = a.tipo || "normal", sensitive = a.sensible === "si", rx = a.receta === "si";
    const am = ["limpiador"], pm = ["limpiador"], notes = [];
    // un solo retinoide por la noche: tretinoína > adapaleno (si hay acné) > retinol
    const aging = has("arrugas") || a.edad === "35-45" || a.edad === "45+";
    const acne = has("acne") || has("puntos");
    let retinoid = null;
    if (rx && (aging || acne)) retinoid = "tretinoina";
    else if (acne) retinoid = "adapaleno";
    else if (aging || has("manchas") || (a.edad === "25-35" && !sensitive)) retinoid = "retinol";
    if (has("acne") && !sensitive) am.push("peroxido");
    if (has("rojez") || (sensitive && (has("acne") || has("manchas")))) am.push("azelaico");
    else if (has("manchas") || has("apagada") || aging) am.push("vitc");
    if (has("brillo") || has("manchas") || tipo === "grasa" || tipo === "mixta") am.push("niacinamida");
    am.push("hidratante", "protector");
    if (retinoid) pm.push(retinoid);
    if (has("puntos") || has("afeitado")) pm.push("salicilico");
    pm.push("hidratante");
    if (sensitive && retinoid) notes.push("Piel sensible: empieza el retinoide 2 noches por semana y ponlo encima del hidratante (“sándwich”) para que irrite menos.");
    if (pm.includes("salicilico") && retinoid) notes.push("No uses el salicílico la misma noche que el retinoide: alterna noches.");
    if (am.includes("peroxido") && retinoid === "tretinoina") notes.push("Peróxido por la mañana y tretinoína por la noche: juntos se anulan.");
    if (has("afeitado")) notes.push("Afeitado: a favor del pelo, con cuchilla de 1–2 hojas o recortadora, gel sin alcohol y piel húmeda. Si salen muchos pelos enquistados, deja barba corta de 1–2 mm.");
    if (has("acne")) notes.push("Si tienes granos grandes, dolorosos o que dejan cicatriz, ve al dermatólogo: hay tratamientos orales que funcionan mucho mejor.");
    notes.push("Introduce un producto nuevo cada 2 semanas: si algo te irrita, sabrás cuál es. Constancia > cantidad.");
    return {
      am: [...new Set(am)].map((id) => step(id, tipo)),
      pm: [...new Set(pm)].map((id) => step(id, tipo)),
      notes, skip: SKIP.map((s) => ({ ...s, source: s.source ? SOURCES[s.source] : null })),
    };
  }

  return { LEVELS, SOURCES, INGREDIENTS, QUIZ, CONCERNS, SKIP, routine };
});
