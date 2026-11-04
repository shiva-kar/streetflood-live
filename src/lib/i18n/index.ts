export type Language = "en" | "kn" | "hi" | "mr";

export interface Translations {
  appName: string;
  tagline: string;
  tabMap: string;
  tabReport: string;
  tabAlerts: string;
  tabHelp: string;
  searchPlaceholder: string;
  useMyLocation: string;
  locating: string;
  nearMeHeadline: string;
  statusSafe: string;
  statusSafeDesc: string;
  statusCaution: string;
  statusCautionDesc: string;
  statusAvoid: string;
  statusAvoidDesc: string;
  statusDanger: string;
  statusDangerDesc: string;
  reportFlooding: string;
  waterDepth: string;
  footpathLevel: string;
  footpathDesc: string;
  ankleDeep: string;
  ankleDesc: string;
  kneeDeep: string;
  kneeDesc: string;
  waistDeep: string;
  waistDesc: string;
  addPhoto: string;
  optionalNote: string;
  submitReport: string;
  submitting: string;
  reportSuccess: string;
  safeRoute: string;
  whereTo: string;
  findRoute: string;
  nearestShelter: string;
  directions: string;
  callEmergency: string;
  emergencyHotline: string;
  floodChecklist: string;
  controlRoom: string;
  signIn: string;
  signOut: string;
  offlineNotice: string;
  whyExplanation: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  kn: {
    appName: "ಸ್ಟ್ರೀಟ್‌ಫ್ಲಡ್ ಲೈವ್",
    tagline: "ಬೆಂಗಳೂರು ನೇರ ರಸ್ತೆ ಜಲಾವೃತ ಮಾಹಿತಿ ಮತ್ತು ಸುರಕ್ಷಿತ ಮಾರ್ಗಗಳು",
    tabMap: "ನಕ್ಷೆ",
    tabReport: "ವರದಿ ಮಾಡಿ",
    tabAlerts: "ಎಚ್ಚರಿಕೆಗಳು",
    tabHelp: "ಸಹಾಯ",
    searchPlaceholder: "ರಸ್ತೆ, ಬಿಬಿಎಂಪಿ ಆಶ್ರಯ ತಾಣ ಅಥವಾ ಪ್ರದೇಶ ಹುಡುಕಿ...",
    useMyLocation: "ನನ್ನ ಸ್ಥಳ ಬಳಸಿ",
    locating: "ಸ್ಥಳವನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    nearMeHeadline: "ನಿಮ್ಮ ಸಮೀಪದ ಪರಿಸ್ಥಿತಿ",
    statusSafe: "ಸುರಕ್ಷಿತ: ರಸ್ತೆಗಳು ಸಂಚಾರಯೋಗ್ಯ",
    statusSafeDesc: "ರಸ್ತೆಗಳಲ್ಲಿ ನೀರಿಲ್ಲ, ಸಂಚಾರಕ್ಕೆ ಯಾವುದೇ ಅಡ್ಡಿಯಿಲ್ಲ.",
    statusCaution: "ಎಚ್ಚರಿಕೆ: ರಸ್ತೆಯಲ್ಲಿ ನೀರು",
    statusCautionDesc: "ಹಿಮ್ಮಡಿಯವರೆಗೆ ನೀರು. ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ, ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.",
    statusAvoid: "ತಪ್ಪಿಸಿ: ಆಳವಾದ ನೀರು",
    statusAvoidDesc: "ಮೊಣಕಾಲಿನವರೆಗೆ ನೀರು. ದ್ವಿಚಕ್ರ ವಾಹನಗಳು ನಿಲ್ಲುವ ಅಪಾಯವಿದೆ.",
    statusDanger: "ಅಪಾಯ: ರಸ್ತೆ ಮುಚ್ಚಲಾಗಿದೆ / ತೀವ್ರ ಪ್ರವಾಹ",
    statusDangerDesc: "ಸೊಂಟದವರೆಗೆ ನೀರು ಅಥವಾ ರಸ್ತೆ ಸಂಪೂರ್ಣ ಬಂದ್. ಮುಂದೆ ಸಾಗಬೇಡಿ.",
    reportFlooding: "ಜಲಾವೃತ ವರದಿ ಸಲ್ಲಿಸಿ",
    waterDepth: "ನೀರಿನ ಆಳ",
    footpathLevel: "ಪಾದಚಾರಿ ಮಾರ್ಗ ಮಟ್ಟ",
    footpathDesc: "ರಾಜಕಾಲುವೆ ಉಕ್ಕಿ ಹರಿಯುವುದು, ಸಣ್ಣ ಗುಂಡಿಗಳು",
    ankleDeep: "ಹಿಮ್ಮಡಿ ಮಟ್ಟ",
    ankleDesc: "5–10 ಸೆಂ.ಮೀ ನೀರು, ನಡೆದಾಡಬಹುದು",
    kneeDeep: "ಮೊಣಕಾಲು ಮಟ್ಟ",
    kneeDesc: "20–40 ಸೆಂ.ಮೀ, ದ್ವಿಚಕ್ರ ವಾಹನ ಸ್ಥಗಿತ ಅಪಾಯ",
    waistDeep: "ಸೊಂಟ ಅಥವಾ ಹೆಚ್ಚಿನ ಮಟ್ಟ",
    waistDesc: "ಅತ್ಯಂತ ಅಪಾಯಕಾರಿ, ವಾಹನಗಳು ಮುಳುಗುತ್ತವೆ",
    addPhoto: "ಫೋಟೋ ಸೇರಿಸಿ (ಐಚ್ಛಿಕ)",
    optionalNote: "ವಿವರ ಅಥವಾ ಹೆಗ್ಗುರುತು (ಉದಾ: ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಬಳಿ)",
    submitReport: "ನೇರ ವರದಿ ಸಲ್ಲಿಸಿ",
    submitting: "ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...",
    reportSuccess: "ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ವರದಿ ಎಲ್ಲರಿಗೂ ತಕ್ಷಣ ಲೈವ್ ಆಗಿದೆ.",
    safeRoute: "ಸುರಕ್ಷಿತ ಮಾರ್ಗ",
    whereTo: "ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?",
    findRoute: "ಸುರಕ್ಷಿತ ಮಾರ್ಗ ಹುಡುಕಿ",
    nearestShelter: "ಸಮೀಪದ ಬಿಬಿಎಂಪಿ ಸುರಕ್ಷಿತ ಆಶ್ರಯ",
    directions: "ಮಾರ್ಗದರ್ಶನ",
    callEmergency: "112 ಕರೆ ಮಾಡಿ (ತುರ್ತು)",
    emergencyHotline: "ಬಿಬಿಎಂಪಿ ಸಹಾಯವಾಣಿ: 1533 | ತುರ್ತು: 112",
    floodChecklist: "ಪ್ರವಾಹ ಸನ್ನದ್ಧತಾ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ",
    controlRoom: "ನಿಯಂತ್ರಣ ಕೊಠಡಿ (Control Room)",
    signIn: "ಸೈನ್ ಇನ್",
    signOut: "ಸೈನ್ ಔಟ್",
    offlineNotice: "ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ. ವರದಿಯನ್ನು ಉಳಿಸಲಾಗಿದೆ, ಆನ್‌ಲೈನ್ ಬಂದಾಗ ಕಳುಹಿಸಲಾಗುವುದು.",
    whyExplanation: "ಈ ಸುರಕ್ಷತಾ ಸ್ಕೋರ್ ಏಕೆ?",
  },
  en: {
    appName: "StreetFlood Live",
    tagline: "Live Hyperlocal Street Flood Conditions & Safe Routes",
    tabMap: "Map",
    tabReport: "Report",
    tabAlerts: "Alerts",
    tabHelp: "Help",
    searchPlaceholder: "Search streets, shelters...",
    useMyLocation: "Use my location",
    locating: "Locating...",
    nearMeHeadline: "Conditions Near You",
    statusSafe: "Safe: Clear Conditions",
    statusSafeDesc: "Roads are clear and passable with normal conditions.",
    statusCaution: "Caution: Water on Road",
    statusCautionDesc: "Ankle-deep water. Walk carefully; slow traffic.",
    statusAvoid: "Avoid: Deep Water",
    statusAvoidDesc: "Knee-deep water. Small vehicles risk engine stalling.",
    statusDanger: "Danger: Closed / Impassable",
    statusDangerDesc: "Waist-deep water or official road closure. Do not enter.",
    reportFlooding: "Report Flooding",
    waterDepth: "Water Depth",
    footpathLevel: "Footpath Level",
    footpathDesc: "Puddles, drains overflowing",
    ankleDeep: "Ankle Deep",
    ankleDesc: "5–10 cm water, walkable",
    kneeDeep: "Knee Deep",
    kneeDesc: "20–40 cm, 2-wheelers risk stalling",
    waistDeep: "Waist or Higher",
    waistDesc: "Dangerous, cars submerged",
    addPhoto: "Add Photo (Optional)",
    optionalNote: "Notes or landmark (e.g. near station subway)",
    submitReport: "Submit Live Report",
    submitting: "Submitting...",
    reportSuccess: "Thank you! Your report is now live for everyone nearby.",
    safeRoute: "Safe Navigation",
    whereTo: "Where do you need to go?",
    findRoute: "Find Safe Route",
    nearestShelter: "Nearest Safe Shelter",
    directions: "Directions",
    callEmergency: "Call 112 (Emergency)",
    emergencyHotline: "National Disaster Helpline: 1078 | Emergency: 112",
    floodChecklist: "Disaster Preparedness Checklist",
    controlRoom: "Control Room",
    signIn: "Sign In",
    signOut: "Sign Out",
    offlineNotice: "You are offline. Reports are saved and will upload when online.",
    whyExplanation: "Why this safety score?",
  },
  hi: {
    appName: "स्ट्रीटफ्लड लाइव",
    tagline: "लाइव सड़क जलभराव की स्थिति और सुरक्षित मार्ग",
    tabMap: "नक्शा",
    tabReport: "रिपोर्ट करें",
    tabAlerts: "अलर्ट",
    tabHelp: "मदद",
    searchPlaceholder: "सड़क, शरणस्थल या इलाका खोजें...",
    useMyLocation: "मेरा स्थान उपयोग करें",
    locating: "स्थान खोजा जा रहा है...",
    nearMeHeadline: "आपके आसपास की स्थिति",
    statusSafe: "सुरक्षित: सड़कें खुली हैं",
    statusSafeDesc: "सड़कें सामान्य हैं और यातायात के लिए सुरक्षित हैं।",
    statusCaution: "सावधान: सड़क पर पानी",
    statusCautionDesc: "टखनों तक पानी। संभलकर चलें, धीमी गति से वाहन चलाएं।",
    statusAvoid: "बचें: गहरा पानी",
    statusAvoidDesc: "घुटनों तक पानी। छोटे वाहनों के बंद होने का खतरा है।",
    statusDanger: "खतरा: सड़क बंद / अत्यधिक जलभराव",
    statusDangerDesc: "कमर तक पानी या आधिकारिक रूप से बंद। आगे न बढ़ें।",
    reportFlooding: "जलभराव की रिपोर्ट करें",
    waterDepth: "पानी की गहराई",
    footpathLevel: "फुटपाथ स्तर",
    footpathDesc: "गटर ओवरफ्लो, छोटे गड्ढे",
    ankleDeep: "टखनों तक",
    ankleDesc: "5–10 सेमी पानी, पैदल संभव",
    kneeDeep: "घुटनों तक",
    kneeDesc: "20–40 सेमी, 2-पहिया बंद होने का डर",
    waistDeep: "कमर या उससे अधिक",
    waistDesc: "खतरनाक, वाहन डूब सकते हैं",
    addPhoto: "तस्वीर जोड़ें (वैकल्पिक)",
    optionalNote: "विवरण या पहचान स्थल (उदा. स्टेशन के पास)",
    submitReport: "रिपोर्ट भेजें",
    submitting: "भेजा जा रहा है...",
    reportSuccess: "धन्यवाद! आपकी रिपोर्ट सभी के लिए लाइव हो गई है।",
    safeRoute: "सुरक्षित मार्ग",
    whereTo: "आप कहाँ जाना चाहते हैं?",
    findRoute: "सुरक्षित रास्ता खोजें",
    nearestShelter: "निकटतम सुरक्षित आश्रय",
    directions: "दिशा-निर्देश",
    callEmergency: "112 पर कॉल करें (आपातकाल)",
    emergencyHotline: "आपदा हेल्पलाइन: 1078 | आपातकाल: 112",
    floodChecklist: "बाढ़ सुरक्षा चेकलिस्ट",
    controlRoom: "कंट्रोल रूम",
    signIn: "साइन इन",
    signOut: "साइन आउट",
    offlineNotice: "आप ऑफलाइन हैं। रिपोर्ट सहेजी गई है और ऑनलाइन होने पर भेजी जाएगी।",
    whyExplanation: "यह सुरक्षा स्कोर क्यों?",
  },
  mr: {
    appName: "स्ट्रीटफ्लड लाइव",
    tagline: "थेट रस्ते पूर परिस्थिती आणि सुरक्षित मार्ग",
    tabMap: "नकाशा",
    tabReport: "नोंदवा",
    tabAlerts: "इशारे",
    tabHelp: "मदत",
    searchPlaceholder: "रस्ता किंवा सुरक्षित केंद्र शोधा...",
    useMyLocation: "माझे स्थान वापरा",
    locating: "स्थान शोधत आहे...",
    nearMeHeadline: "तुमच्या जवळची परिस्थिती",
    statusSafe: "सुरक्षित: रस्ते मोकळे आहेत",
    statusSafeDesc: "रस्ते स्वच्छ असून सुरक्षित वाहतूक सुरू आहे.",
    statusCaution: "सावधान: रस्त्यावर पाणी",
    statusCautionDesc: "घोट्यापर्यंत पाणी. काळजीपूर्वक चाला, वाहने हळू चालवा.",
    statusAvoid: "टाळा: खोल पाणी",
    statusAvoidDesc: "गुडघ्यापर्यंत पाणी. दुचाकी व लहान वाहने बंद पडू शकतात.",
    statusDanger: "धोका: रस्ता बंद / तीव्र पूर",
    statusDangerDesc: "कमरेपर्यंत पाणी किंवा अधिकृत रस्ता बंद. पुढे जाऊ नका.",
    reportFlooding: "पूर परिस्थिती नोंदवा",
    waterDepth: "पाण्याची पातळी",
    footpathLevel: "फुटपाथ पातळी",
    footpathDesc: "गटारे ओसंडून वाहत आहेत",
    ankleDeep: "घोट्यापर्यंत",
    ankleDesc: "5–10 सेमी पाणी, चालणे शक्य",
    kneeDeep: "गुडघ्यापर्यंत",
    kneeDesc: "20–40 सेमी, दुचाकी वाहने बंद पडण्याचा धोका",
    waistDeep: "कमरेपर्यंत किंवा जास्त",
    waistDesc: "धोकादायक, वाहने बुडू शकतात",
    addPhoto: "छायाचित्र जोडा (पर्यायी)",
    optionalNote: "तपशील किंवा महत्त्वाची खूण (उदा. स्टेशन जवळ)",
    submitReport: "थेट नोंदवा",
    submitting: "नोंदवत आहे...",
    reportSuccess: "धन्यवाद! तुमची नोंद परिसरातील सर्वांसाठी प्रसिद्ध झाली आहे.",
    safeRoute: "सुरक्षित मार्ग",
    whereTo: "तुम्हाला कुठे जायचे आहे?",
    findRoute: "सुरक्षित मार्ग शोधा",
    nearestShelter: "जवळचा सुरक्षित निवारा",
    directions: "दिशा-निर्देश",
    callEmergency: "112 वर संपर्क साधा",
    emergencyHotline: "आपत्ती मदत कक्ष: 1078 | आणीबाणी: 112",
    floodChecklist: "पूर सुरक्षा पूर्वतयारी",
    controlRoom: "नियंत्रण कक्ष",
    signIn: "साइन इन करा",
    signOut: "साइन आउट",
    offlineNotice: "तुम्ही ऑफलाइन आहात. नोंद जतन केली असून ऑनलाइन आल्यावर पाठवली जाईल.",
    whyExplanation: "हा सुरक्षा स्कोअर कशामुळे?",
  },
};

let currentLang: Language = "en";
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem("streetflood_lang") as Language;
    if (saved && TRANSLATIONS[saved]) return saved;
  }
  return currentLang;
}

export function setLanguage(lang: Language) {
  currentLang = lang;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("streetflood_lang", lang);
  }
  listeners.forEach((l) => l());
}

export function useI18n(): Translations {
  const lang = getLanguage();
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}
