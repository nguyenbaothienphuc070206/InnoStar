import { IsString, IsUrl } from "class-validator";

export class RegisterCameraDto {
  @IsString()
  id!: string;

  @IsUrl()
  streamUrl!: string;

  @IsString()
  zone!: string;
}
