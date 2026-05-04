export interface Challenge {
  id: string;
  question: string;
  qrCode: string;
  reward: number;
}

export interface Destination {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  shortDescription: string;
  fullStory: string;
  greenHint: string;
  qrChallenges: Challenge[];
  transportReward: {
    bike: number;
    ev: number;
    walk: number;
  };
  unlockScore: number;
  verifiedBy?: string;
}

export const destinations: Destination[] = [
  {
    id: "cuchi",
    name: "Dia dao Cu Chi",
    category: "history",
    lat: 11.1434,
    lng: 106.462,
    shortDescription: "Mang luoi dia dao gan lien voi lich su khang chien.",
    fullStory:
      "Noi day tung la he thong phong thu ngam voi benh xa, bep Hoang Cam va duong lien lac giup luc luong tru vung trong giai doan kho khan.",
    greenHint: "Gui xe ngoai cong, di bo de cam nhan khong gian sinh thai.",
    transportReward: {
      bike: 20,
      ev: 25,
      walk: 30
    },
    unlockScore: 60,
    verifiedBy: "HCMC Tourism Board",
    qrChallenges: [
      {
        id: "cuchi-1",
        question: "Tim tam bang ghi nam mo rong dia dao.",
        qrCode: "QR_CUCHI_001",
        reward: 15
      }
    ]
  },
  {
    id: "war-remnants",
    name: "Bao tang Chung tich Chien tranh",
    category: "history",
    lat: 10.7798,
    lng: 106.6922,
    shortDescription: "Khong gian tu lieu ve cac giai doan lich su cua thanh pho.",
    fullStory:
      "Bao tang luu giu nhieu bo suu tap hinh anh, hien vat va cau chuyen ve hoi uc do thi, giup nguoi xem hieu sau hon boi canh lich su Sai Gon.",
    greenHint: "Di bo theo cum cong vien xung quanh de giam ap luc giao thong trung tam.",
    transportReward: {
      bike: 18,
      ev: 24,
      walk: 28
    },
    unlockScore: 45,
    verifiedBy: "HCMC Tourism Board",
    qrChallenges: [
      {
        id: "war-remnants-1",
        question: "Tim phong trung bay ve bao ton hoa binh.",
        qrCode: "QR_WAR_001",
        reward: 12
      }
    ]
  },
  {
    id: "independence-palace",
    name: "Dinh Doc Lap",
    category: "history",
    lat: 10.7781,
    lng: 106.6953,
    shortDescription: "Bieu tuong kien truc va cot moc lich su hien dai Viet Nam.",
    fullStory:
      "Dinh Doc Lap la diem giao nhau giua lich su, kien truc va ngoai giao. Khong gian noi that va ham nguyen ban mang den trai nghiem song dong cho nguoi tham quan.",
    greenHint: "Uu tien EV hoac di bo tu bai xe de giu khu trung tam thoang khi.",
    transportReward: {
      bike: 16,
      ev: 22,
      walk: 26
    },
    unlockScore: 50,
    verifiedBy: "HCMC Tourism Board",
    qrChallenges: [
      {
        id: "palace-1",
        question: "Tim thong tin ve phong hop lich su trong khu trung tam dinh.",
        qrCode: "QR_DDL_001",
        reward: 14
      }
    ]
  }
];
