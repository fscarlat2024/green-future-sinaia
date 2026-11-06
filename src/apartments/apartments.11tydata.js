// Setari comune pentru toate apartamentele (fisierele .md din acest folder).
// Fiecare apartament e generat in ambele limbi (ro + en) prin pagination.
module.exports = {
  layout: "apartment.njk",
  scripts: ["/assets/js/booking.js", "/assets/js/review.js"],
  pagination: {
    data: "languages",
    size: 1,
    alias: "lang",
    addAllPagesToCollections: true
  },
  eleventyComputed: {
    permalink: (data) =>
      data.lang === "ro"
        ? `/apartamente/${data.page.fileSlug}/`
        : `/en/apartments/${data.page.fileSlug}/`,
    backLink: (data) => (data.lang === "ro" ? "/#apartamente" : "/en/#apartamente"),
    urlRo: (data) => `/apartamente/${data.page.fileSlug}/`,
    urlEn: (data) => `/en/apartments/${data.page.fileSlug}/`,
    title: (data) => `${data.name} - ${data.site.name}`,
    // Campuri rezolvate pe limba curenta, ca sablonul sa foloseasca nume simple
    tagline: (data) => (data.lang === "ro" ? data.tagline_ro : data.tagline_en),
    description: (data) => (data.lang === "ro" ? data.tagline_ro : data.tagline_en),
    capacity: (data) => (data.lang === "ro" ? data.capacity_ro : data.capacity_en),
    roomType: (data) => (data.lang === "ro" ? data.roomType_ro : data.roomType_en),
    metaExtra: (data) => (data.lang === "ro" ? data.metaExtra_ro : data.metaExtra_en),
    amenities: (data) => (data.lang === "ro" ? data.amenities_ro : data.amenities_en),
    desc: (data) => (data.lang === "ro" ? data.desc_ro : data.desc_en),
    priceUnit: (data) => (data.lang === "ro" ? data.priceUnit_ro : data.priceUnit_en),
    ogImage: (data) => data.hero
  }
};
