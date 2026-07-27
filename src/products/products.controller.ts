import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { SessionKeys } from '../session/session.decorator';
import { SessionGuard } from '../session/session.guard';
import { UserKeys } from '../session/session.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 등록 시 Voyage로 임베딩을 생성해 pgvector 컬럼에 저장한다 (RAG 검색용 인덱스).
  @Post()
  @UseGuards(SessionGuard)
  create(@SessionKeys() keys: UserKeys, @Body() dto: CreateProductDto) {
    return this.productsService.create(keys.voyageApiKey, dto);
  }

  // 목록/상세 응답에는 embedding 배열이 포함되지 않는다 (service의 select로 제외).
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }
}
