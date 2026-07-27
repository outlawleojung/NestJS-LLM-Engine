import { CreateProductDto } from '../products/dto/create-product.dto';

export const SAMPLE_PRODUCTS: CreateProductDto[] = [
  {
    name: '무선 노이즈캔슬링 헤드폰',
    category: '오디오/헤드폰',
    features: '액티브 노이즈 캔슬링, 40시간 배터리, 블루투스 5.3, 40mm 드라이버, 하이엔드 사운드',
  },
  {
    name: '오픈형 무선 이어폰',
    category: '오디오/이어폰',
    features: '오픈형 디자인, 6시간 재생 + 케이스 24시간, IPX4 방수, 저지연 모드',
  },
  {
    name: '휴대용 블루투스 스피커',
    category: '오디오/스피커',
    features: '20W 출력, IP67 방수, 24시간 재생, TWS 페어링, 야외용',
  },
  {
    name: '기계식 저소음 무선 키보드',
    category: '주변기기/키보드',
    features: '저소음 적축, 무선/유선 겸용, RGB 백라이트, 텐키리스, 사무실 사용 적합',
  },
  {
    name: '버티컬 무선 마우스',
    category: '주변기기/마우스',
    features: '손목 피로 감소 각도, 6버튼, USB-C 충전, 2.4GHz + 블루투스 듀얼모드',
  },
  {
    name: '4K 웹캠',
    category: '주변기기/카메라',
    features: '4K 해상도, 자동 노출·화이트밸런스, 프라이버시 셔터, 삼각대 마운트, 화상회의용',
  },
  {
    name: '보습 수분 크림',
    category: '뷰티/스킨케어',
    features: '히알루론산 5종 복합, 무향, 민감성 피부용, 100ml, 건조한 계절에 적합',
  },
  {
    name: 'SPF50+ 무기자차 썬크림',
    category: '뷰티/스킨케어',
    features: '자외선 차단 SPF50+ PA++++, 산화아연 기반, 백탁 없음, 여름 필수템',
  },
  {
    name: '매트 롱래스팅 립스틱',
    category: '뷰티/메이크업',
    features: '10시간 지속, 매트 마감, 벨벳 텍스처, 딥레드 컬러',
  },
  {
    name: '캠핑용 접이식 의자',
    category: '아웃도어/캠핑',
    features: '알루미늄 프레임, 1.2kg 초경량, 하중 120kg, 컴팩트 수납백 포함',
  },
];
