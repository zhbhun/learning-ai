## 模型

- Checkpoint：通过 Dreambooth 训练方式得到的大模型，特点是出图效果好，但由于训练的是一个完整的新模型，所以训练速度普遍较慢，生成模型文件较大，一般几个 G，文件格式为 safetensors 或 ckpt。
- LoRA：一种轻量化的模型微调训练方法，是在原有大模型的基础上，对该模型进行微调，用于输出固定特征的人或事物。特点是对于特定风格特征的出图效果好，训练速度快，模型文件小，一般几十到一百多 MB，需要搭配大模型使用。
- Textual Inversion：一种使用文本提示来训练模型的方法，可以简单理解为一组打包的提示词，用于生成固定特征的人或事物。特点是对于特定风格特征的出图效果好，模型文件非常小，一般几十 K，但是训练速度较慢，需要搭配大模型使用。
- Hypernetwork：类似 LoRA，但模型效果不如 LoRA，需要搭配大模型使用。
- VAE：它的作用就是提升图像色彩效果，让画面看上去不会那么灰蒙蒙，此外对图像细节进行细微调整。

ps：Checkpoint > LoRA > Textual Inversion > Hypernetwork，通常情况 Checkpoint 模型搭配 LoRA 或 Textual Inversion 模型使用，可以获得更好的出图效果。


参考

- [SD好复杂，是不是很糊，一文搞懂Stable Diffusion的各种模型及用户操作界面](https://www.aimaven.vip/article/5068)

### 综合

- [SD XL](https://civitai.com/models/101055/sd-xl)
- [DreamShaper](https://civitai.com/models/4384?modelVersionId=128713)：胜任多种风格（写实、原画、2.5D 等），能生成很棒的人像和风景图。

  ```
  (masterpiece), (extremely intricate:1.3), (realistic), portrait of a girl, the most beautiful in the world, (medieval armor), metal reflections, upper body, outdoors, intense sunlight, far away castle, professional photograph of a stunning woman detailed, sharp focus, dramatic, award winning, cinematic lighting, octane render  unreal engine,  volumetrics dtx, (film grain, blurry background, blurry foreground, bokeh, depth of field, sunset, motion blur:1.3), chainmail
  Negative prompt: BadDream, (UnrealisticDream:1.3)
  Steps: 30, Size: 512x832, Seed: 5775713, Model: DreamShaper8_pruned, Version: v1.4.1, Sampler: DPM++ SDE Karras, CFG scale: 9, Clip skip: 2, Model hash: 879db523c3, Hires steps: 20, Hires upscale: 2.2, Hires upscaler: 8x_NMKD-Superscale_150000_G, ADetailer model: face_yolov8n.pt, ADetailer prompt: "photo of a blonde girl, (film grain)", (UnrealisticDream: 1.3)", ADetailer version: 23.6.1.post0, Denoising strength: 0.46, ADetailer mask blur: 4, ADetailer model 2nd: hand_yolov8n.pt, ADetailer confidence: 0.3, ADetailer dilate/erode: 4, ADetailer mask blur 2nd: 4, ADetailer confidence 2nd: 0.3, ADetailer inpaint padding: 0, ADetailer negative prompt: "BadDream, ADetailer dilate/erode 2nd: 4, ADetailer denoising strength: 0.27, ADetailer inpaint only masked: True, ADetailer inpaint padding 2nd: 32, ADetailer negative prompt 2nd: "BadDream, ADetailer denoising strength 2nd: 0.3, ADetailer inpaint only masked 2nd: True
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/c1033497-007c-4a73-b812-915c8e32e8fe/width=450/26072224-5775713-(masterpiece),%20(extremely%20intricate_1.3),%20(realistic),%20portrait%20of%20a%20girl,%20the%20most%20beautiful%20in%20the%20world,%20(medieval%20armor),%20me.jpeg)

- [Lyriel](https://civitai.com/models/22922/lyriel)：胜任多种风格，能实现顶级的光影效果和人物风景细节。


  ```
  (dark shot:1.1), epic realistic, portrait of halo, sunglasses, blue eyes, tartan scarf, white hair by atey ghailan, by greg rutkowski, by greg tocchini, by james gilleard, by joe fenton, by kaethe butcher, gradient yellow, black, brown and magenta color scheme, grunge aesthetic!!! graffiti tag wall background, art by greg rutkowski and artgerm, soft cinematic light, adobe lightroom, photolab, hdr, intricate, highly detailed, (depth of field:1.4), faded, (neutral colors:1.2), (hdr:1.4), (muted colors:1.2), hyperdetailed, (artstation:1.4), cinematic, warm lights, dramatic light, (intricate details:1.1), complex background, (rutkowski:0.66), (teal and orange:0.4)
  Negative prompt: 3d, cartoon, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, young, loli, elf, 3d, illustration
  Steps: 30, Size: 512x768, Seed: 1261263585, Model: Lyriel_v16, Sampler: DPM++ 2M Karras, CFG scale: 9, Clip skip: 2, Model hash: e96852ac4a, Hires steps: 38, Hires resize: 832x1280, Hires upscaler: Latent, Denoising strength: 0.56
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/c028d3fe-669c-44c0-9eac-b9d67f729492/width=450/00014-1261263585.jpeg)

- [Juggernaut XL](https://civitai.com/models/133005/juggernaut-xl)

### 动漫/卡通

- [Counterfeit-V3.0](https://civitai.com/models/4468/counerfeit-v25)：高质量二次元、人物、风景模型，用于生成比较可爱的人物形象和老式动漫风格。

  ```
  prompt: (masterpiece, best quality),1girl with long white hair sitting in a field of green plants and flowers, her hand under her chin, warm lighting, white dress, blurry foreground
  Negative prompt: EasyNegativeV2
  Steps: 25, ENSD: 31337, Size: 512x1024, Seed: 1293666383, Model: CF5_Counterfeit-V3.0_fix_fix_fix, Sampler: DPM++ 2M Karras, CFG scale: 10, Clip skip: 2, Model hash: db6cd0a62d, Hires upscale: 2, Hires upscaler: R-ESRGAN 4x+ Anime6B, Denoising strength: 0.5
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/dd9914c5-f37a-4cc0-1f26-80b2dcd23d00/width=450/000.jpeg)

  ps：需要额外加载 VAE 模型，提升色彩表现 —— https://huggingface.co/gsdf/Couterfeit-V2.5/blob/main/Couterfeit-V2.5.vae.pt

- [ReV Animated](https://civitai.com/models/7371/rev-animated)：适用于动漫人物或场景的 2.5D 或 3D 绘制模型 。


  ```
  (masterpiece, best quality:1.4), cinematic light, colorful, high contrast, mountain, grass, tree, night, (horror (theme):1.2), (masterpiece, best quality:1.4), (captivating digital art), cinematic lighting, colorful, high contrast, eerie mountain landscape, lush grass, twisted trees, night scene, (horror theme:1.2), (menacing monster:1.2) lurking in shadows, dark atmosphere, blood rain pouring down, blood-red river flowing, haunting blood moon in the sky, chilling and intense visual experience, dark, blood rain, blood river, blood moon, (rating_explicit), (score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, high res, 4k)
  Negative prompt: (worst quality:1.2), (low quality:1.2), (lowres:1.1), (monochrome:1.1), (greyscale), multiple views, comic, sketch, (((bad anatomy))), (((deformed))), (((disfigured))), watermark, multiple_views, mutation hands, mutation fingers, extra fingers, missing fingers, watermark, (rating_safe), (score_3_up, score_4_up, score_5_up, monochrome, vector art, blurry)
  Steps: 30, VAE: vae-ft-mse-840000-ema-pruned.ckpt, Size: 512x768, Seed: 2666025601, Model: revAnimated_V2_Rebirth, Version: v1.6.0, Sampler: DPM++ 2M Karras, CFG scale: 8.5, Clip skip: 2, Model hash: 0ca0c297a4, Hires steps: 36, Hires upscale: 2, Hires upscaler: 4x_foolhardy_Remacri, Denoising strength: 0.55
  ```

- [GhostMix](https://civitai.com/models/36520?modelVersionId=76907)：提供了令人印象深刻的绘画效果，适合创造幻想世界。

  ```
  1mechanical girl,((ultra realistic details)), portrait, detailed face,global illumination, shadows, octane render, 8k, ultra sharp,metal,intricate,  ornaments detailed, cold colors, egypician detail, highly intricate details, realistic light, trending on cgsociety, glowing eyes, facing camera, neon details, machanical limbs,blood vessels connected to tubes,mechanical cervial attaching to neck,wires and cables connecting to head,blood,killing machine
  Negative prompt: NSFW,3d, cartoon, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, young, loli, elf, 3d, illustration  ng_deepnegative_v1_75t  EasyNegative
  Steps: 30, ENSD: 31337, Size: 512x768, Seed: 1065244439, Model: GhostMix-V2.0-fp16-BakedVAE, Sampler: DPM++ 2M Karras, CFG scale: 5, Clip skip: 2, Model hash: 0f5ef4c164, Hires steps: 20, Hires upscale: 2, Hires upscaler: 4x-UltraSharp, Denoising strength: 0.5
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/3297b492-1dcc-4e42-a061-ec74e11da49e/width=1024,quality=90/5.jpeg)

- [Protogen v2.2 (Anime)](https://civitai.com/models/3627/protgenv22-aime-offiial-release)：偏向数字绘画

  ```
  full shot body photo of the most beautiful artwork in the world featuring ww2 nurse holding a liquor bottle sitting on a desk nearby, smiling, freckles, white outfit, nostalgia, sexy, stethoscope,  heart professional majestic oil painting by Ed Blinkey, Atey Ghailan, Studio Ghibli, by Jeremy Mann, Greg Manchess, Antonio Moro, trending on ArtStation, trending on CGSociety, Intricate, High Detail, Sharp focus, dramatic, photorealistic painting art by midjourney and greg rutkowski
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/1e0853cf-2201-4c9e-4b67-44495e7fb100/width=450/00008.jpeg)

- [Protogen x3.4 (Photorealism)](https://civitai.com/models/3666/protgenx34-photoreaism-offiial-release)：更偏向真人
  
  ```
  modelshoot style, (extremely detailed CG unity 8k wallpaper), full shot body photo of the most beautiful artwork in the world, medieval princess, professional majestic oil painting by Ed Blinkey, Atey Ghailan, Studio Ghibli, by Jeremy Mann, Greg Manchess, Antonio Moro, trending on ArtStation, trending on CGSociety, Intricate, High Detail, Sharp focus, dramatic, photorealistic painting art by midjourney and greg rutkowski
  Negative prompt: canvas frame, cartoon, 3d, ((disfigured)), ((bad art)), ((deformed)),((extra limbs)),((close up)),((b&w)), wierd colors, blurry,  (((duplicate))), ((morbid)), ((mutilated)), [out of frame], extra fingers, mutated hands, ((poorly drawn hands)), ((poorly drawn face)), (((mutation))), (((deformed))), ((ugly)), blurry, ((bad anatomy)), (((bad proportions))), ((extra limbs)), cloned face, (((disfigured))), out of frame, ugly, extra limbs, (bad anatomy), gross proportions, (malformed limbs), ((missing arms)), ((missing legs)), (((extra arms))), (((extra legs))), mutated hands, (fused fingers), (too many fingers), (((long neck))), Photoshop, video game, ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, mutation, mutated, extra limbs, extra legs, extra arms, disfigured, deformed, cross-eye, body out of frame, blurry, bad art, bad anatomy, 3d render
  Steps: 30, Seed: 3630420726, Sampler: DPM++ SDE Karras, CFG scale: 10
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d4609b5f-a44b-4864-79ed-16f49de45400/width=450/00021.jpeg)

- [MeinaMix](https://civitai.com/models/7240/meinamix)：高质量二次元、人物模型，场景动漫风格化明显，常用来生成壁纸以及电影化的图。

  ```
  1girl, japanese clothes, ponytail ,white hair, purple eyes, magic circle, blue fire, blue flames, wallpaper, landscape, blood, blood splatter, depth of field, night, light particles, light rays, sidelighting, thighs, fate \(series\), genshin impact, ****, open jacket, skirt, thighhighs, cloud
  Negative prompt: (worst quality:1.6, low quality:1.6), (zombie, sketch, interlocked fingers, comic)
  Steps: 30, Size: 512x1024, Seed: 3474686987, Model: Meina V11, Version: v1.4.0, Sampler: DPM++ 2M Karras, CFG scale: 7, Clip skip: 2, Model hash: 54ef3e3610, Hires steps: 15, Hires upscale: 2, Hires upscaler: R-ESRGAN 4x+ Anime6B, Denoising strength: 0.45
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d0c38bc9-bc80-458a-93f6-550cac33b7ab/width=450/00001.jpeg)

- [AnythingElse V4](https://civitai.com/models/4855/anythingelse-v4)：简单的阴影，整体亮度，饱和的颜色，干净明快。

  ```
  paint, on table, room, morning, leaf, lgbtq
  Steps: 25, Size: 512x768, Seed: 1247105077, Sampler: Euler a, CFG scale: 7, Clip skip: 2, Created Date: 2024-06-01T1212:20.9443792Z
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/f01066c6-ad41-4d5b-834a-874d5b1150b3/width=450/B50974F3116AAC2B97922EE590474D3CB20507EAEEB2953756C628D415FD150E.jpeg)

- [AbyssOrangeMix2](https://civitai.com/models/4437?modelVersionId=5021)：适用于绘制动漫角色

  ```
  absurdres, 1girl, ocean, railing, white dress, sun hat,
  Negative prompt: (worst quality:1.2), (low quality:1.2), (lowres:1.1), (monochrome:1.1), (greyscale), multiple views, comic, sketch, animal ears, pointy ears, blurry, transparent, see-through,
  Steps: 25, ENSD: 31337, Size: 512x512, Seed: 1565672939, Sampler: DPM++ 2M Karras, CFG scale: 7, Clip skip: 2, Model hash: b644d850c9, Hires upscale: 2, Hires upscaler: Latent (nearest), Denoising strength: 0.6
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/49e0950a-ec4f-4ea6-cfb2-fd1951c14600/width=450/00713-b644d850c9-1565672939.jpeg)

---

[Stable Diffusion | 13款卡通动漫模型出图测试](https://www.uied.cn/38605.html)

### 插画

- [Dreamlike Diffusion 1.0](https://civitai.com/models/1274/drealike-diffsion-10)：偏向插画

  ```
  firework in the sky by kyoto animation, insanely detailed. instagram photo, kodak portra. by wlop, ilya kuvshinov, krenz cushart, greg rutkowski, pixiv. zbrush sculpt, octane, maya, houdini, vfx. huge cityscape. cinematic dramatic atmosphere, sharp focus, volumetric lighting
  Negative prompt: ugly, amateur, poorly drawn, extra limbs, missing fingers
  Steps: 30, Size: 512x1024, Seed: 2410789820, Model: dreamlikeDiffusion10_10,, Sampler: Euler a, CFG scale: 6, Model hash: 0aecbcfa2c
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/fda434aa-b1cb-4415-911c-2faa3f10b9f4/width=450/6da9071a697808e0ffc58a824f285475b678ff884fedf11498a7aa17c334dd09.jpeg)

- [Vectorartz Diffusion](https://civitai.com/models/95/vectorartz-diffusion)：矢量风格模型。

  ```
  beautiful landscape, scenery, digital wallpaper, aesthetic, dramatic, <lora:Vector_illustration:1>,  <lora:XieS:1>
  Negative prompt: Concordant-neg, person, (people), portrait, humans,
  Steps: 20, VAE: vae-ft-mse-840000-ema-pruned.ckpt, NGMS: 2, Size: 512x704, XieS: 88f5cd34154c", Seed: 498203136, Model: vectorartzDiffusion_v1, Version: v1.6.0, Sampler: UniPC, VAE hash: c6a580b13a, CFG scale: 6, Model hash: 75fd827a64, Hires upscale: 1.05, Hires upscaler: ESRGAN_4x, "Concordant-neg: e2973254e1ad", Denoising strength: 0.7, "Vector_illustration: 20524fad3455
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/637d5c7d-81a0-411f-b613-b0fdc2a44bfc/width=450/00026-498203136.jpeg)

- [Samdoesarts Ultmerge](https://civitai.com/models/68/samdoesarts-ultmerge)：Samdoesarts 艺术风格模型。

  ```
  samdoesarts style award winning half body portrait of a beautiful woman in a croptop and cargo pants with ombre navy blue teal hairstyle with head in motion and hair flying, paint splashes, splatter, outrun, vaporware, shaded flat illustration, digital art, trending on artstation, highly detailed, fine detail, intricate
  Negative prompt: cartoon, ((disfigured)), ((bad art)), ((deformed)), ((poorly drawn)), ((extra limbs)), ((close up)), ((b&w)), weird colors, blurry
  Steps: 30, Size: 512x704, Seed: 2136548201, Sampler: Euler a, CFG scale: 7, Batch pos: 0, Batch size: 4, Model hash: 8687d7a5
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/86293752-4a43-4920-61ff-e20ff8faa600/width=450/00008-2136548201-cf7-Euler%20a-s30-8687d7a5.jpeg)

- [Flonix MJ Style](https://civitai.com/models/6488/flonix-mj-style)：Flonix MJ 插画风格。

  ```
  trapped princess looking at the viewer from behind the window, royal clothes, 3d render Pixar stylemodel made of Hiroaki Takahashi art ultra perfect composition 3d liquid detailing fluid acrylic by Greg Tocchini, James Gilleard, Joe Fenton Kaethe, Butcher Bosch, Dan Mumford, Kandinsky art style [collage] [splatter] [streak] [crop] [cut]
  Negative prompt: 3d, catoon, jpeg large artifacts, jpeg small artifacts, ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, extra limbs, disfigured, deformed, body out of frame, blurry, bad anatomy, blurred, watermark, grainy, signature, cut off, draft, not finished drawing, unfinished image, bad eyes,
  Steps: 20, Size: 512x672, Seed: 2461294032, Sampler: Euler a, CFG scale: 7, Model hash: 3115afd3, Hires upscale: 1.5, Hires upscaler: Latent, Denoising strength: 0.7
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/9be91741-ef69-4d63-1245-1daea0387300/width=450/06925-2461294032-trapped%20princess%20looking%20at%20the%20viewer%20from%20behind%20the%20window,%20royal%20clothes,%203d%20render%20Pixar%20stylemodel%20made%20of%20Hiroaki%20Takahas.jpeg)

### 写实

- [Realistic vision](https://civitai.com/models/4201/reaistic-ision-v20)：能很好的实现极具真实感的人物和环境塑造，还原真实世界风格。

  ```
  instagram photo, front shot, portrait photo of a 24 y.o woman, wearing dress, beautiful face, cinematic shot, dark shot
  Negative prompt: (nsfw, naked, nude, deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, mutated hands and fingers:1.4), (deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, amputation
  Steps: 6, VAE: vae-ft-mse-840000-ema-pruned.safetensors, Size: 512x768, Seed: 925691612, Model: RVHYPO, Version: v1.7.0, Sampler: DPM++ SDE Karras, CFG scale: 1.5, Model hash: 0928b30687, Hires steps: 3, Hires upscale: 2, Hires upscaler: 4x_NMKD-Superscale-SP_178000_G, ADetailer model: mediapipe_face_mesh_eyes_only, ADetailer sampler: DPM++ SDE Karras, ADetailer version: 24.1.2, Denoising strength: 0.35, ADetailer mask blur: 4, ADetailer confidence: 0.3, ADetailer dilate erode: 4, ADetailer inpaint padding: 32, ADetailer denoising strength: 0.35, ADetailer inpaint only masked: True, ADetailer use separate sampler: True
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/9d8e6d7d-7a26-44b4-a02d-131f53fd5d77/width=1024,quality=90/00027-925691612.jpeg)

- [Dreamlike Photoreal 2.0](https://civitai.com/models/3811/drealike-photreal-20)：偏向真实照片。

  ```
  (masterpiece), cozy, mountains, snow, village, high quality, ultrahd, 4k, 8k, 16k
  Negative prompt: (low quality, bad quality, worst quality, normal quality), badly drawn, noisy, noise, blurred, ugly, cropped, out of frame, (double:1.4), (repeated:1.4), (repeating:1.4), signature, text, font, watermark
  Steps: 25, VAE: vae-ft-mse-840000-ema-pruned.ckpt, Size: 1024x1024, Seed: 2454425448, Model: dreamlike-photoreal-2.0, Version: v1.7.0, Sampler: DPM++ 2M SDE Karras, CFG scale: 7, Model hash: 92970aa785, Face restoration: GFPGAN
  ```

  ![](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/1cacfbac-88cb-479b-9889-5bd8cf2b5a87/width=450/5e871b49-6fc6-4657-a7c8-c2db07735d9a.jpeg)

### 建筑

- [architectural design sketches with markers](https://civitai.com/models/34384/architectural-design-sketches-with-markers)：建筑设计草图模型
- [XSarchitectral-InteriorDesign-ForXSLora](https://civitai.com/models/28112/xsarchitectural-interiordesign-forxslora)：室内设计模型

  ps：建议配合 LoRA 使用： https://civitai.com/models/25383/xsarchitectural-7modern-interior。

### 图标

- [大厂落地实战！如何用Stable Diffusion完成B端和C端图标设计？](https://www.uisdc.com/aigc-icon-design)
- [DDicon](https://civitai.com/models/38511/ddicon?modelVersionId=44447)：一款生成 B 端风格元素的模型

  ps：需要结合对应版本的 DDicon lora 使用。V1 版本细节多，v2 版本更简洁，使用时搭配 LoRA 模型 DDICON_lora（ https://civitai.com/models/38558/ddiconlora ）。

- [Product Design](https://civitai.com/models/23893/product-design-minimalism-eddiemauro)：一个工业产品设计模型。

### 特殊

- [Isometric Future](https://civitai.com/models/10063/isometric-future)：一个等距微缩模型。

### Lora

- [Detail Tweaker LoRA (细节调整LoRA)](https://civitai.com/models/58390/detail-tweaker-lora-lora)

  ```
  <lora:add_detail:1>
  ```

- [blindbox](https://civitai.com/models/25995/blindbox?modelVersionId=32988)：可生成盲盒风格的模型，使用时主模型建议选 ReV Animated。
- [Bilgewater](https://civitai.com/models/23344?modelVersionId=27879)：场景风格模型。
- [剪纸](https://civitai.com/models/14892)：剪纸风格模型。
- [Anime Lineart](https://civtai.commodels/16014/anime-lineart-style)：线稿画风模型。
- [Concept Scenery Scene](https://civitai.com/models/23682/conceptsceneryscenev2)：风景场景模型。
- [Howls Moving Castle](https://civitai.com/models/14605?modelVersionId=19998)：风景场景模型。
- [Makoto Shinkai](https://civitai.com/models/10626/makoto-shinkai-substyles-style-lora)：新海诚画风模型。
- [Studio Ghibli Style](https:/civita.com/odels/6526/studio-ghibli-style-lora)：吉卜力风格模型。
- [Airconditioner](https://civitai.com/models/22607/loconlora-airconditioner-style)：适合画城镇，荒野，鲜花，小清新质感。
- [Stamp_v1](https://civitai.com/models/15629/stampv1)：图标 logo 风格。
- [Vecor Graphics Art Style](https://civitai.com/models/34321/vector-graphics-art-style-no-lineart)：矢量图形风格。
- [Miniture world style 微缩世界风格](https:/civiai.com/models/28531/miniature-world-style)：微缩世界风格模型。
- [ligne claire style](https://civitai.com/models/5406/ligne-claire-stylecogecha)：焦茶画风。
- [Gacha splash LORA](https://civitai.com/models/13090/gacha-splash-lora)：带背景的立绘风格。
- [沁彩 Colorwater](https://civitai.com/models/16055/colorwater)：水彩风格模型。
- [moffmachi_style](https://civitai.com/models/23563/lohamoffmachi-style)：卡通格。

### Tetual Inversion

- [SamDoesArts](https://civitai.com/models/1247/samdoesarts-embedding-1)：SamDoesArt 画风。触发词：SamDoesArt1。
- [RFKTR's Plastic Style](http://civitai.com/models/4512/rfktrs-plastic-style)：塑料风格
- [Adventure Diffusion](https://civitai.com/models/6841/adventure-diffusion)：原神风格。
- [Neon Diffusion](https://civitai.com/models/6016/neon-diffusion)：赛博朋克风格。
- [Inkpunk768](https://civitai.com/models/1288/inkpunk768)：墨水朋克风格。
- [evreka](https://civitai.com/models/3966/evreka1-5)：平面插画风格。
- [Coloring Book Style](https://civitai.com/models/49040/coloring-book-style)：黑白稿风格。
- [PlanIt! a documentation](https://civitai.com/models/4775/planit-a-documentation-embedding)：说明书风格。
- [Style of HOPA Games](https://civitai.com/models/18424/style-of-hopa-games-landscapes-and-scenery-concept-art-in-style-of-video-games-hoppagames)：游戏场景风格。
- [Autumn Style](https://civitai.com/models/1998/autumn-style)：晚秋风格。
- [Glorious Style](https://civitai.com/models/2110/glorious-style)：宏伟场景风格。
- [21charturnerv2](https://civitai.com/models/3036?modelVersionId=9857)：三视图风格。
- [Style Paint Magic](https://civitai.com/models/18052/style-paint-magic)：油漆画风格。
- [Double Exposure for SD 2.x](https://civitai.com/models/2386/double-exposure-for-sd-2x)：图像重叠风格。
- [cartoonish_doll](https://civitai.com/models/1618/cartoonishdoll)：卡通娃娃风格。
- [Style-Info: An embedding for infographic style art](https://civitai.com/models/5271/style-info-an-embedding-for-infographic-style-art)：信息图风格。

### VAE

- [Stable Diffusion高级教程 - VAE](https://www.dongwm.com/post/stable-diffusion-vae/)
- [Stable Diffusion WebUI 出图颜色发灰？用好VAE立马解决~](https://www.uisdc.com/stable-diffusion-webui-5)


## 内嵌

### 提示词

- [gsdf/EasyNegative](https://huggingface.co/datasets/gsdf/EasyNegative/tree/main)

  [stablediffusion插件：简易负向提示词 EasyNegative](https://www.stablediffusion-cn.com/sd/sd-use/1598.html)

## 参考

- [出图效率倍增！47个高质量的 Stable Diffusion 常用模型推荐](https://www.uisdc.com/47-stable-diffusion-models)
- [Stable Diffusion 7 个顶流大模型推荐！哪个更好用？](https://www.uisdc.com/group/533713.html)
- [2023年10月最新stable diffusion模型推荐（含：各类模型介绍）](https://www.stablediffusion-cn.com/sd/sd-model/3976.html)

## 参考

- [出图效率倍增！47个高质量的 Stable Diffusion 常用模型推荐](https://www.uisdc.com/47-stable-diffusion-models)
- [2023年10月最新stable diffusion模型推荐（含：各类模型介绍）](https://www.stablediffusion-cn.com/sd/sd-model/3976.html)
- [Stable Diffusion  7 个顶流大模型推荐！哪个更好用？](https://www.uisdc.com/group/533713.html)