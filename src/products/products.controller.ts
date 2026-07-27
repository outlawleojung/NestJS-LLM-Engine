import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { SessionKeys } from '../session/session.decorator';
import { SessionGuard } from '../session/session.guard';
import { UserKeys } from '../session/session.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(SessionGuard)
  create(@SessionKeys() keys: UserKeys, @Body() dto: CreateProductDto) {
    return this.productsService.create(keys.voyageApiKey, dto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }
}
