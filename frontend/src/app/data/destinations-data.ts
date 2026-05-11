export interface DestinationData {
  id: string;
  title: string;
  description: string;
  vibe: string;
  bestGuide: "coba" | "chutai" | "ut";
  lat: number;
  lng: number;
}

export const destinationsData: Record<string, DestinationData> = {
  benThanh: {
    id: "benThanh",
    title: "Ben Thanh Market",
    description: "Biểu tượng thương mại của Sài Gòn từ năm 1914. Điểm giao thoa giữa lịch sử, nhịp sống đô thị và văn hóa bản địa.",
    vibe: "Lịch sử & Thương mại",
    bestGuide: "coba",
    lat: 10.7714,
    lng: 106.6979
  },
  warMuseum: {
    id: "warMuseum",
    title: "War Remnants Museum",
    description: "Bảo tàng Chứng tích Chiến tranh - không gian tư liệu về các giai đoạn chiến tranh trong lịch sử Việt Nam.",
    vibe: "Lịch sử & Giáo dục",
    bestGuide: "coba",
    lat: 10.7798,
    lng: 106.6922
  },
  reunificationPalace: {
    id: "reunificationPalace",
    title: "Reunification Palace",
    description: "Dinh Độc Lập - biểu tượng quan trọng của lịch sử hiện đại Việt Nam, kiến trúc độc đáo và ấn tượng.",
    vibe: "Lịch sử & Kiến trúc",
    bestGuide: "coba",
    lat: 10.7781,
    lng: 106.6953
  },
  park239: {
    id: "park239",
    title: "September 23rd Park",
    description: "Công viên 23/9 - điểm sinh hoạt phổ biến, gần nhiều tuyến xe và khu thương mại đời thường.",
    vibe: "Đời sống bản địa",
    bestGuide: "chutai",
    lat: 10.7689,
    lng: 106.6937
  },
  youthHouse: {
    id: "youthHouse",
    title: "Youth Cultural House",
    description: "Nhà Văn hóa Thanh Niên - không gian cộng đồng quen thuộc, dễ bắt nhịp đời sống bản địa.",
    vibe: "Văn hóa & Cộng đồng",
    bestGuide: "chutai",
    lat: 10.7834,
    lng: 106.7008
  },
  coGiangCafe: {
    id: "coGiangCafe",
    title: "Co Giang Cafe Street",
    description: "Góc local ít quảng bá trên hẻm Cô Giang, phù hợp khám phá trải nghiệm chân thực.",
    vibe: "Hidden Gems & Cafe",
    bestGuide: "ut",
    lat: 10.7642,
    lng: 106.6923
  },
  banCoFood: {
    id: "banCoFood",
    title: "Ban Co Local Eats",
    description: "Khu ăn uống bản địa đậm chất dân cư khu Bàn Cờ, nhiều món ít người review.",
    vibe: "Ẩm thực & Khám phá",
    bestGuide: "ut",
    lat: 10.7729,
    lng: 106.6821
  },
  nguyenTraiRooftop: {
    id: "nguyenTraiRooftop",
    title: "Nguyen Trai Rooftop",
    description: "Điểm nhìn thành phố theo góc local khu Nguyễn Trãi, thiên về trải nghiệm khám phá.",
    vibe: "View & Chill",
    bestGuide: "ut",
    lat: 10.7666,
    lng: 106.6846
  }
};

export function getDestinationById(id: string): DestinationData | undefined {
  return destinationsData[id];
}

export function getDestinationsByGuide(guide: "coba" | "chutai" | "ut"): DestinationData[] {
  return Object.values(destinationsData).filter(d => d.bestGuide === guide);
}
