// Panoul in engleza: buton RO | EN in antet. In engleza, textele romanesti sunt inlocuite din dictionar pe masura ce apar.
// Limba implicita: alegerea salvata, altfel limba telefonului (orice nu e romana -> engleza).
(function () {
  const KEY = "gf_lang";
  const get = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "ro"]).join(",").toLowerCase();
  const lang = get() || (/(^|,)ro\b/.test(langs) ? "ro" : "en");
  window.gfAdminLang = lang;

  // buton RO | EN langa Iesire
  document.addEventListener("DOMContentLoaded", () => {
    const exit = document.getElementById("adm-logout");
    if (!exit) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "pn-exit pn-lang"; b.textContent = lang === "en" ? "RO" : "EN";
    b.setAttribute("aria-label", lang === "en" ? "Română" : "English");
    b.addEventListener("click", () => { try { localStorage.setItem(KEY, lang === "en" ? "ro" : "en"); } catch {} location.reload(); });
    exit.before(b);
  });
  if (lang !== "en") return;
  document.documentElement.lang = "en";

  const D = {
    "Panou": "Panel", "Ieșire": "Log out", "Meniu panou": "Panel menu", "Panou - Green Future Sinaia": "Panel - Green Future Sinaia",
    "Email sau parolă greșită.": "Wrong email or password.", "Parola actuală nu e corectă.": "The current password is not correct.",
    "Parola nouă trebuie să aibă cel puțin 8 caractere.": "The new password must have at least 8 characters.",
    "Parola nouă trebuie să fie diferită de cea actuală.": "The new password must be different from the current one.",
    "Prea multe încercări. Reîncearcă în 15 minute.": "Too many attempts. Try again in 15 minutes.",
    "Perioada se suprapune cu o rezervare sau cu un calendar extern.": "The period overlaps a booking or an external calendar.",
    "Rezervarea și-a schimbat deja starea.": "The booking has already changed status.",
    "Completează ambele ore, diferite între ele, sau lasă-le goale pe amândouă.": "Fill in both times, different from each other, or leave both empty.",
    "Mută sau șterge întâi produsele din această categorie.": "Move or delete the products in this category first.",
    "Scrie numele.": "Write the name.", "Adaugă cel puțin 3 poze.": "Add at least 3 photos.",
    "Scrie descrierea apartamentului și salveaz-o.": "Write the apartment description and save it.",
    "Poți avea cel mult 20 de poze.": "You can have at most 20 photos.", "Fișierul nu e o poză validă.": "The file is not a valid photo.",
    "Poza e prea mare.": "The photo is too large.", "Numărul de telefon nu pare corect.": "The phone number does not look right.",
    "Verifică datele: sfârșitul trebuie să fie după început, iar oferta valabilă cel puțin azi.": "Check the dates: the end must be after the start, and the offer valid at least today.",
    "Verifică valorile introduse.": "Check the values you entered.", "Pune un preț pe noapte înainte de a activa rezervările.": "Set a nightly price before turning on bookings.",
    "Linkul calendarului trebuie să înceapă cu https://.": "The calendar link must start with https://.",
    "Nu ai acces la acest apartament.": "You do not have access to this apartment.", "Cheia pentru notificări nu e pusă pe server.": "The notification key is not set on the server.",
    "De confirmat": "To confirm", "Confirmată": "Confirmed", "Refuzată": "Declined", "Anulată": "Cancelled", "Expirată": "Expired",
    "Sesiunea a expirat.": "Your session has expired.", "Operațiunea nu a reușit.": "The operation failed.", "Autentificarea nu a reușit.": "Sign-in failed.",
    "Intră în panou": "Sign in to the panel", "Parolă": "Password", "Intră": "Sign in", "Email": "Email",
    "Sună femeia de serviciu": "Call the cleaner", "Sună tehnicianul": "Call the technician", "Sună spălătoria": "Call the laundry",
    "Număr nesetat": "Number not set", "Fără proprietar setat": "No owner set", "Apartamentele mele": "My apartments",
    "Acasă": "Home", "grad de ocupare": "occupancy", "venit din platformă": "income from the platform",
    "rezervare de confirmat": "booking to confirm", "rezervări de confirmat": "bookings to confirm", "mesaj necitit": "unread message", "mesaje necitite": "unread messages",
    "Chat cu chiriașii": "Chat with guests", "Următorii oaspeți": "Next guests", "Nicio rezervare directă viitoare.": "No upcoming direct bookings.",
    "Mai mult": "More", "Site-ul": "The website", "Înapoi la Green Future": "Back to Green Future", "Din panou": "From the panel",
    "Nu există recenzii încă.": "No reviews yet.", "Emailul pleacă a doua zi după plecare, pentru rezervările directe confirmate.": "The email goes out the day after check-out, for confirmed direct bookings.",
    "Ascunsă": "Hidden", "Afișează": "Show", "Ascunde": "Hide", "Numerele apar ca butoane de apel la toți proprietarii.": "The numbers appear as call buttons for all owners.",
    "Femeia de serviciu": "Cleaner", "Tehnician": "Technician", "Spălătorie": "Laundry", "Salvează": "Save",
    "Oaspete fără note de la gazde.": "Guest without ratings from hosts.", "Alege": "Choose", "Comunicare": "Communication",
    "Notă privată, o vezi doar tu": "Private note, only you see it", "Curățenie lăsată": "Cleanliness", "Respectarea regulilor": "Following the rules",
    "L-aș primi din nou": "I would host them again", "Notă (opțional, privată)": "Note (optional, private)",
    "Celelalte gazde văd doar mediile, nu și nota scrisă.": "Other hosts see only the averages, not the written note.",
    "Actualizează nota": "Update rating", "Salvează nota": "Save rating", "Notează oaspetele": "Rate the guest",
    "Rezervări": "Bookings", "Nimic de confirmat.": "Nothing to confirm.", "Confirmă": "Confirm", "Refuză": "Decline",
    "Refuzi această rezervare? Oaspetele primește un email.": "Decline this booking? The guest gets an email.", "Anulează": "Cancel",
    "Anulezi această rezervare confirmată? Oaspetele primește un email.": "Cancel this confirmed booking? The guest gets an email.",
    "Nu există rezervări încă.": "No bookings yet.", "Se trimite...": "Sending...", "Anunț în aplicație": "In-app announcement",
    "Titlu": "Title", "Mesaj": "Message", "Pagina deschisă la apăsare": "Page opened on tap", "Prima pagină": "Home page", "Trimite": "Send",
    "Nouă": "New", "Livrată": "Delivered", "Comenzi la cameră": "Room orders", "Nicio comandă nouă.": "No new orders.",
    "Lista se actualizează singură. Lasă pagina deschisă și atinge ecranul o dată ca să se audă sunetul la comenzile noi.": "The list updates by itself. Keep the page open and tap the screen once so new orders make a sound.",
    "Marchează livrată": "Mark delivered", "Nu există comenzi încă.": "No orders yet.", "Program comenzi": "Ordering hours",
    "Acum se primesc comenzi.": "Orders are open now.", "Acum nu se primesc comenzi.": "Orders are closed now.", "Fără program: comenzile se primesc oricând.": "No schedule: orders are accepted any time.",
    "De la": "From", "Până la": "Until", "Salvează programul": "Save hours", "Ștergi produsul din meniu? Comenzile vechi rămân.": "Delete the product from the menu? Past orders stay.",
    "Șterge produsul": "Delete product", "Poză": "Photo", "Fără poză.": "No photo.", "Alege o poză": "Choose a photo", "Se încarcă...": "Uploading...",
    "Poza nu a putut fi încărcată.": "The photo could not be uploaded.", "Scoate poza": "Remove photo", "‹ Înapoi la meniu": "‹ Back to menu",
    "Produs nou": "New product", "Nume în română": "Name in Romanian", "Nume în engleză (opțional)": "Name in English (optional)", "Preț (lei)": "Price (lei)",
    "Descriere în română": "Description in Romanian", "Descriere în engleză": "Description in English", "Alergeni în română": "Allergens in Romanian", "Alergeni în engleză": "Allergens in English",
    "Verifică alergenii cu bucătăria. Ce scrii aici văd oaspeții înainte să comande.": "Check the allergens with the kitchen. Guests see this before ordering.",
    "Apare în meniu": "Shown in the menu", "Adaugă produsul": "Add product", "Nu apare în meniu": "Not shown in the menu", "Epuizat azi: reactivează": "Sold out today: reactivate",
    "Epuizat azi": "Sold out today", "Editează": "Edit", "Nume în engleză": "Name in English", "Salvează categoria": "Save category", "Adaugă produs": "Add product",
    "Redenumește": "Rename", "Ștergi categoria goală?": "Delete the empty category?", "Șterge categoria": "Delete category", "Categorie nouă": "New category",
    "Adaugă categoria": "Add category", "Categorie": "Category", "Meniu": "Menu", "Meniu bistro": "Bistro menu", "Comenzi": "Orders",
    "Ai mesaje necitite.": "You have unread messages.", "Nimic necitit.": "Nothing unread.", "Nu există mesaje încă.": "No messages yet.",
    "Scrie răspunsul": "Write your reply", "Răspuns": "Reply", "Înapoi": "Back", "Mesaje": "Messages",
    "Oaspeți": "Guests", "Nu există conturi încă.": "No accounts yet.", "Nivel": "Level", "Membri": "Members", "Doar informare": "Information only",
    "Toți oaspeții": "All guests", "Oaspete șters": "Deleted guest", "Niciun telefon cu aplicația nu e autentificat în acest public.": "No phone with the app is signed in for this audience.",
    "Ofertă nouă": "New offer", "Oferte": "Offers",
    "Scrie {nume} ca să apară prenumele oaspetelui în cont. Oferta se folosește o singură dată, iar reducerea nu se adună cu cea de nivel. La sejur se aplică doar apartamentelor care participă la club.": "Write {nume} to show the guest's first name in their account. The offer can be used once, and the discount does not add up with the level discount. For stays it only applies to apartments in the club.",
    "Pentru cine": "For whom", "Reducere la sejur": "Discount on stays", "Reducere la bistro": "Discount at the bistro", "Reducere (%)": "Discount (%)",
    "Valabilă până la": "Valid until", "Creează oferta": "Create offer", "Oaspeții le văd în tabul Cont.": "Guests see them in the Account tab.",
    "Activă": "Active", "Oprită": "Stopped", "Trimiți notificarea? Nu poate fi retrasă.": "Send the notification? It cannot be undone.",
    "Trimite notificare": "Send notification", "Oprești oferta?": "Stop the offer?", "Oprește": "Stop", "Nu există oferte încă.": "No offers yet.",
    "Numele apartamentului": "Apartment name", "Câte persoane": "How many guests", "Tip (ex. garsonieră, 2 camere)": "Type (e.g. studio, 2 rooms)",
    "O frază scurtă": "A short tagline", "De ce ai amenajat locul așa? Ce simte cineva când intră aici?": "Why did you design the place this way? How does it feel to walk in?",
    "Povestea apartamentului (apare într-un chenar auriu)": "The apartment's story (shown in a gold frame)", "Descriere": "Description",
    "Facilități, câte una pe rând": "Amenities, one per line", "Nota pe Booking (ex. 9,4)": "Booking score (e.g. 9.4)",
    "Număr evaluări pe Booking": "Number of Booking reviews", "Link Booking": "Booking link", "Apartament nou": "New apartment",
    "Îl poți completa pe rând. Apare pe site abia după ce îl trimiți și e aprobat.": "You can fill it in step by step. It appears on the site only after you submit it and it is approved.",
    "Continuă cu pozele": "Continue with photos", "Alege poze": "Choose photos",
    "Poza nu a putut fi încărcată. Verifică internetul și încearcă din nou.": "The photo could not be uploaded. Check your connection and try again.",
    "Ștergi poza?": "Delete the photo?", "Șterge": "Delete", "Prima": "First", "Prezentare": "Presentation", "Salvează prezentarea": "Save presentation", "Publicare": "Publishing",
    "Ai nevoie de cel puțin 3 poze, descriere și preț pe noapte. Pentru rezervări, bifează și „Rezervările sunt active pe site”.": "You need at least 3 photos, a description and a nightly price. For bookings, also tick \"Bookings are active on the site\".",
    "Publică": "Publish", "Trimis, așteaptă aprobarea": "Submitted, awaiting approval", "Trimite spre aprobare": "Submit for approval", "Aprobă": "Approve",
    "Scoate de pe site": "Remove from site", "Prima poză apare în listă.": "The first photo is shown in the list.", "Setări": "Settings",
    "Rezervările sunt active pe site": "Bookings are active on the site", "Confirmare pe loc, fără aprobarea proprietarului": "Instant confirmation, without the owner's approval",
    "Particip la Green Future Club: oaspeții Silver primesc 5%, iar cei Gold 10% din prețul nopților, din încasarea proprietarului": "I take part in Green Future Club: Silver guests get 5% and Gold guests 10% off the nightly price, from the owner's income",
    "Preț pe noapte (lei)": "Price per night (lei)", "Curățenie (lei)": "Cleaning (lei)", "Oaspeți maxim": "Max guests", "Nopți minim": "Minimum nights",
    "Anulare gratuită (zile înainte)": "Free cancellation (days before)", "Ora de sosire": "Check-in time", "Ora de plecare": "Check-out time",
    "Email proprietar (primește rezervările)": "Owner email (receives bookings)", "Telefon proprietar (îl vede oaspetele confirmat)": "Owner phone (shown to confirmed guests)",
    "Calendar Booking.com / Airbnb (link iCal)": "Booking.com / Airbnb calendar (iCal link)",
    "Pune pe pauză preluarea din Booking / Airbnb. Atenție: rezervările noi de acolo nu mai închid perioada aici.": "Pause importing from Booking / Airbnb. Note: new bookings there will no longer block dates here.",
    "Calendare externe": "External calendars", "Pune acest link în Booking.com sau Airbnb, ca rezervările de aici să închidă perioada și acolo:": "Put this link in Booking.com or Airbnb so bookings made here block the dates there too:",
    "Link calendar exportat": "Exported calendar link", "Preluarea din Booking / Airbnb e pe pauză. Perioadele deja preluate rămân închise.": "Importing from Booking / Airbnb is paused. Dates already imported stay blocked.",
    "Nu s-a sincronizat încă.": "Not synced yet.", "Sincronizează acum": "Sync now", "Până la (exclusiv)": "Until (exclusive)",
    "Prețuri pe perioade": "Seasonal prices", "Sezon, sărbători, weekenduri. În afara acestor perioade se aplică prețul de bază.": "Season, holidays, weekends. Outside these periods the base price applies.",
    "Etichetă": "Label", "Adaugă perioada": "Add period", "Perioade închise": "Blocked dates", "Motiv": "Reason", "Închide perioada": "Block dates",
    "Adaugă apartament": "Add apartment", "Apartament": "Apartment", "Apartamente": "Apartments",
    "Ex.: Fumatul interzis în apartament. Liniște după ora 22. Animalele de companie doar cu acordul gazdei.": "E.g.: No smoking in the apartment. Quiet after 10 pm. Pets only with the host's consent.",
    "Check-in online": "Online check-in", "Check-in": "Check-in",
    "Oaspetele trimite poza buletinului și bifează regulamentul. Rezervările de pe site primesc linkul automat. Pentru oaspeții de pe Booking sau Airbnb, trimite-le acest link pe WhatsApp:": "The guest sends a photo of their ID and ticks the rules. Bookings made on the site get the link automatically. For guests from Booking or Airbnb, send them this link on WhatsApp:",
    "Link check-in": "Check-in link", "Copiază linkul": "Copy link", "Copiat": "Copied", "Regulamentul apartamentului a fost salvat.": "The apartment rules were saved.",
    "Regulamentul apartamentului (opțional; dacă îl scrii, oaspetele trebuie să-l bifeze)": "Apartment rules (optional; if you write them, the guest must accept them)",
    "Salvează regulamentul": "Save rules", "Ciornă, nu apare pe site": "Draft, not on the site", "Așteaptă aprobarea": "Awaiting approval", "Publicat": "Published",
    "Descarcă poza": "Download photo", "✓ regulament condominiu": "✓ condominium rules", "✓ regulament apartament": "✓ apartment rules",
    "Nu exista niciun regulament de bifat la momentul trimiterii.": "There were no rules to accept when this was sent.",
    "Vezi buletinul": "View ID", "Vezi buletinul (nou)": "View ID (new)",
    "Scrie aici regulamentul simplificat al condominiului. Cât e gol, oaspeții nu au ce bifa.": "Write the simplified condominium rules here. While empty, guests have nothing to accept.",
    "Regulamentul condominiului a fost salvat. Apare la toate check-in-urile noi.": "The condominium rules were saved. They appear on all new check-ins.",
    "Regulamentul condominiului": "Condominium rules", "Text": "Text",
    "Îl văd toți oaspeții la check-in și trebuie să-l bifeze. Regulamentul fiecărui apartament îl scrie proprietarul, la Apartamente.": "All guests see it at check-in and must accept it. Each apartment's rules are written by its owner, under Apartments.",
    "Buletinele trimise de oaspeți. Le vezi doar tu, pentru apartamentele tale, și se șterg automat la 30 de zile după plecare.": "IDs sent by guests. Only you see them, for your apartments, and they are deleted automatically 30 days after check-out.",
    "Niciun check-in încă.": "No check-ins yet.", "Parola mea": "My password", "Parola nouă nu e la fel în cele două câmpuri.": "The new password is not the same in both fields.",
    "Parola a fost schimbată. Pe celelalte telefoane și calculatoare trebuie să intri din nou cu parola nouă.": "Your password was changed. On other phones and computers you need to sign in again with the new password.",
    "Parola actuală": "Current password", "Parola nouă": "New password", "Repetă parola nouă": "Repeat the new password", "Schimbă parola": "Change password",
    "Parola nouă trebuie să aibă cel puțin 8 caractere": "The new password must have at least 8 characters",
    "Prețuri, calendar, reguli": "Prices, calendar, rules", "Recenzii": "Reviews", "Ce spun oaspeții": "What guests say", "Buletine și regulament": "IDs and rules",
    "Bistro, la cameră": "Bistro, room service", "Produse, prețuri, program": "Products, prices, hours", "Conturi și nivele": "Accounts and levels",
    "Reduceri personalizate": "Personal discounts", "Notificări": "Notifications", "Anunț în aplicație ": "In-app announcement", "Echipa": "Team", "Numere de telefon": "Phone numbers",
    "Schimbă parola ": "Change password",
    "Wi-Fi\nBucătărie utilată\nBalcon": "Wi-Fi\nEquipped kitchen\nBalcony",
    "Cui trimiți": "Send to",
    "Programări spa": "Spa bookings", "Intervale și programări": "Time slots and bookings", "Prețuri piscină, spa, sală": "Pool, spa, gym prices",
    "Program și locuri": "Hours and places", "Programările online sunt pornite": "Online booking is on", "Deschide la": "Opens at", "Închide la": "Closes at",
    "Durata unui interval": "Length of a time slot", "Locuri într-un interval": "Places in a time slot", "Cel mult persoane la o programare": "Max people per booking",
    "Cu câte zile înainte se poate programa": "How many days ahead people can book", "Mesaj pe site (opțional), ex. Prosoapele se primesc la recepție": "Message on the site (optional), e.g. Towels are handed out at reception",
    "Mesaj în engleză": "Message in English", "Salvează programul": "Save the schedule", "Salvat. Intervalele noi apar imediat pe site, la Piscină & Spa.": "Saved. The new time slots show on the site right away, under Pool & Spa.",
    "Nicio programare de azi înainte.": "No bookings from today on.", "Anulată": "Cancelled", "Anulează": "Cancel",
    "30 minute": "30 minutes", "45 minute": "45 minutes", "1 oră": "1 hour", "1,5 ore": "1.5 hours", "2 ore": "2 hours", "2,5 ore": "2.5 hours", "3 ore": "3 hours", "4 ore": "4 hours",
    "Abonamente": "Passes", "Piscină, spa, sală": "Pool, spa, gym", "Piscină și spa": "Pool and spa", "Sală de fitness": "Fitness room",
    "Prețurile de la piscină, spa și sală. După salvare apar imediat pe pagina Abonamente.": "Prices for the pool, spa and gym. After saving they appear right away on the Passes page.",
    "Anunț (ex. Spa-ul este închis temporar). Gol = fără anunț": "Notice (e.g. The spa is temporarily closed). Empty = no notice",
    "Anunț în engleză": "Notice in English", "Descriere în engleză": "Description in English", "Nume": "Name",
    "Perioadă (ex. luni – joi)": "Period (e.g. Monday – Thursday)", "Perioadă în engleză": "Period in English",
    "Preț adulți (lei)": "Adult price (lei)", "Preț copii (lei)": "Children price (lei)", "Preț elevi (lei)": "Student price (lei)",
    "Evidențiat": "Highlighted", "Ștergi abonamentul?": "Delete this pass?", "Adaugă abonament": "Add pass",
    "Masaj și închirieri": "Massage and rentals", "Adaugă": "Add", "Salvează prețurile": "Save prices",
    "Salvat. Prețurile apar acum pe site și în aplicație, la Abonamente.": "Saved. The prices now appear on the site and in the app, under Passes.",
  };
  // texte cu numere sau nume in ele
  const P = [
    [/^(\d+) de confirmat\. Cererile fără răspuns expiră după 24 de ore\.$/, (m) => `${m[1]} to confirm. Requests without an answer expire after 24 hours.`],
    [/^(.*) ocupare · (\d+) din (\d+) nopți · luna trecută (.*)$/, (m) => `${m[1]} occupancy · ${m[2]} of ${m[3]} nights · last month ${m[4]}`],
    [/^Ocupare (.*)$/, (m) => `Occupancy ${m[1]}`],
    [/^Luna trecută: (.*) din platformă\. Venitul include doar rezervările directe, pentru că Booking și Airbnb nu transmit prețuri în calendar\. Ocuparea le include și pe ale lor\.$/, (m) => `Last month: ${m[1]} from the platform. Income includes only direct bookings, because Booking and Airbnb do not share prices in the calendar. Occupancy includes theirs too.`],
    [/^(.*) · (\d+) oaspeți · (.*) lei(?: \(reducere club (.*) lei\))?$/, (m) => `${m[1]} · ${m[2]} guests · ${m[3]} lei${m[4] ? ` (club discount ${m[4]} lei)` : ""}`],
    [/^Media (.*) din (\d+) recenzii vizibile\.$/, (m) => `Average ${m[1]} from ${m[2]} visible reviews.`],
    [/^(⚠|★) Notat de (\d+) gazd[ăe]: comunicare (.*) · curățenie (.*) · reguli (.*) · l-ar primi din nou: (\d+) din (\d+)$/, (m) => `${m[1]} Rated by ${m[2]} host${m[2] === "1" ? "" : "s"}: communication ${m[3]} · cleanliness ${m[4]} · rules ${m[5]} · would host again: ${m[6]} of ${m[7]}`],
    [/^Nota ta: comunicare (.*) · curățenie (.*) · reguli (\d)( · nu l-ai primi din nou)?$/, (m) => `Your rating: communication ${m[1]} · cleanliness ${m[2]} · rules ${m[3]}${m[4] ? " · you would not host again" : ""}`],
    [/^(\d) foarte bine$/, (m) => `${m[1]} very good`], [/^(\d) foarte rău$/, (m) => `${m[1]} very bad`],
    [/^Trimiți anunțul pe (\d+) telefoane\? Nu poate fi retras\.$/, (m) => `Send the announcement to ${m[1]} phones? It cannot be undone.`],
    [/^(\d+) telefoane cu aplicația\.$/, (m) => `${m[1]} phones with the app.`],
    [/^(\d+) telefoane cu aplicația, din care (\d+) clienți Attitude\.$/, (m) => `${m[1]} phones with the app, ${m[2]} of them Attitude customers.`],
    [/^Toți utilizatorii Green Future \((\d+)\)$/, (m) => `All Green Future users (${m[1]})`],
    [/^Clienții Attitude: au comandat la bistro din aplicație \((\d+)\)$/, (m) => `Attitude customers: ordered at the bistro in the app (${m[1]})`],
    [/^Trimis: (\d+)(?:, nereușite: (\d+))?\.$/, (m) => `Sent: ${m[1]}${m[2] ? `, failed: ${m[2]}` : ""}.`],
    [/^Notificări trimise: (\d+)(?:, nereușite: (\d+))?\.?$/, (m) => `Notifications sent: ${m[1]}${m[2] ? `, failed: ${m[2]}` : ""}.`],
    [/^(\d+) comenzi noi\.$/, (m) => `${m[1]} new orders.`],
    [/^(\d+) programări de azi înainte\.$/, (m) => `${m[1]} bookings from today on.`],
    [/^(.*) · (\d+) persoane$/, (m) => `${m[1]} · ${m[2]} people`],
    [/^(\d\d:\d\d) · (.*) · (\d+) (persoană|persoane)$/, (m) => `${m[1]} · ${m[2]} · ${m[3]} ${m[3] === "1" ? "person" : "people"}`],
    [/^Intervalele de acum: (.*)\.$/, (m) => `Current time slots: ${m[1].replace("niciunul (programul e prea scurt pentru durata aleasă)", "none (the hours are too short for the chosen length)")}.`], [/^(\d+) produse$/, (m) => `${m[1]} products`],
    [/^(\d+) produse\. Modificările apar imediat pe site și în aplicație\.$/, (m) => `${m[1]} products. Changes appear right away on the site and in the app.`],
    [/^(\d+) noi$/, (m) => `${m[1]} new`], [/^(\d+) conturi în Green Future Club\.$/, (m) => `${m[1]} accounts in Green Future Club.`],
    [/^(\d+) sejururi încheiate · (\d+) comenzi livrate$/, (m) => `${m[1]} completed stays · ${m[2]} delivered orders`],
    [/^Se încarcă (\d+) din (\d+)\.\.\.$/, (m) => `Uploading ${m[1]} of ${m[2]}...`],
    [/^Poze \((\d+)\/20\)$/, (m) => `Photos (${m[1]}/20)`],
    [/^Nu pot citi (poza|pozele) (.*)\. Încearcă poze JPG sau PNG\.$/, (m) => `Cannot read ${m[1] === "poza" ? "the photo" : "the photos"} ${m[2]}. Try JPG or PNG photos.`],
    [/^Ultima sincronizare a eșuat: (.*)$/, (m) => `Last sync failed: ${m[1]}`],
    [/^Sincronizat: (.*)\. Se actualizează la 30 de minute\.$/, (m) => `Synced: ${m[1]}. Updates every 30 minutes.`],
    [/^(.*): (\d+) lei(, minim (\d+) nopți)?( \((.*)\))?$/, (m) => `${m[1]}: ${m[2]} lei${m[4] ? `, minimum ${m[4]} nights` : ""}${m[6] ? ` (${m[6]})` : ""}`],
    [/^(.*) · din calendarul extern(.*)$/, (m) => `${m[1]} · from the external calendar${m[2]}`],
    [/^(.*) · rezervare (GF-\w+)(.*)$/, (m) => `${m[1]} · booking ${m[2]}${m[3]}`],
    [/^(.*) · Booking \/ Airbnb \/ altă sursă(.*)$/, (m) => `${m[1]} · Booking / Airbnb / other source${m[2]}`],
    [/^Trimis (.*)\. Poza se șterge automat pe (.*)\.$/, (m) => `Sent ${m[1]}. The photo is deleted automatically on ${m[2]}.`],
    [/^Ștergi check-in-ul lui (.*), cu tot cu poza buletinului\?$/, (m) => `Delete ${m[1]}'s check-in, together with the ID photo?`],
    [/^Act de identitate (.*)$/, (m) => `ID of ${m[1]}`],
    [/^(.*) · (.*) · până la (.*) · folosită de (\d+) ori$/, (m) => `${m[1]} · ${m[2]} · until ${m[3]} · used ${m[4]} times`],
    [/^Ap\. (.*)$/, (m) => `Apt. ${m[1]}`],
    [/^Curățenie (\d+) · confort (\d+) · facilități (\d+) · locație (\d+) · gazda (\d+) · calitate-preț (\d+)$/, (m) => `Cleanliness ${m[1]} · comfort ${m[2]} · facilities ${m[3]} · location ${m[4]} · host ${m[5]} · value ${m[6]}`],
    [/^(.*) pe nota camerei · (.*)$/, (m) => `${m[1]} on the room bill · ${m[2]}`],
    [/^Mută mai (sus|jos) (.*)$/, (m) => `Move ${m[1] === "sus" ? "up" : "down"} ${m[2]}`],
    [/^(.*) lei$/, (m) => /^[\d.,\s]+$/.test(m[1]) ? `${m[1]} lei` : null],
  ];
  const tr = (s) => {
    if (!s) return s;
    const t = s.trim();
    if (!t) return s;
    if (D[t]) return s.replace(t, D[t]);
    for (const [re, fn] of P) { const m = t.match(re); if (m) { const r = fn(m); if (r) return s.replace(t, r); } }
    return s;
  };
  const ATTR = ["placeholder", "aria-label", "title"];
  const walk = (root) => {
    if (root.nodeType === 3) { const v = tr(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1) return;
    for (const a of ATTR) if (root.hasAttribute?.(a)) { const v = tr(root.getAttribute(a)); if (v !== root.getAttribute(a)) root.setAttribute(a, v); }
    if (root.tagName === "TEXTAREA" || root.tagName === "SCRIPT" || root.tagName === "STYLE") return;
    for (const c of root.childNodes) walk(c);
  };
  const obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") { walk(m.target); continue; }
      m.addedNodes.forEach(walk);
    }
  });
  const start = () => { document.title = tr(document.title); walk(document.body); obs.observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  const al = window.alert.bind(window), cf = window.confirm.bind(window);
  window.alert = (m) => al(tr(String(m)));
  window.confirm = (m) => cf(tr(String(m)));
})();
