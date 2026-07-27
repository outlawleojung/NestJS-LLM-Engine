import { Product } from '../products/entities/product.entity';

export function buildCopyPrompt(product: Product): { system: string; prompt: string } {
  return {
    system:
      '너는 커머스 상세페이지 카피라이터다. 주어진 상품 정보로 구매 전환을 유도하는 카피를 작성한다. 과장 없이 사실 중심, 한국어로 응답.',
    prompt: [
      `상품명: ${product.name}`,
      `카테고리: ${product.category}`,
      `특징: ${product.features}`,
      '',
      '요구사항:',
      '1. 한 줄 헤드라인 (임팩트)',
      '2. 3~5문장의 서브카피 (핵심 특징 강조)',
      '3. 불릿 형태의 주요 셀링 포인트 3~5개',
      '',
      '위 형식대로 마크다운으로 출력해라.',
    ].join('\n'),
  };
}

export function buildQaPrompt(question: string, products: Product[]): { system: string; prompt: string } {
  const context = products
    .map(
      (p, i) =>
        `[상품 ${i + 1}]\n- 상품명: ${p.name}\n- 카테고리: ${p.category}\n- 특징: ${p.features}`,
    )
    .join('\n\n');

  return {
    system:
      '너는 커머스 상품 상담 AI다. 아래 [검색된 상품] 컨텍스트만 근거로 사용자 질문에 답한다. 컨텍스트에 없는 정보는 추측하지 말고 "관련 상품이 없다"고 답한다. 한국어로 응답.',
    prompt: [
      '[검색된 상품]',
      context || '(관련 상품 없음)',
      '',
      `[사용자 질문]`,
      question,
    ].join('\n'),
  };
}
