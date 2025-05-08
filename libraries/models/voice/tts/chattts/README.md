- [ChatTTS](https://github.com/2noise/ChatTTS)
- [Awesome-ChatTTS](https://github.com/libukai/Awesome-ChatTTS)
- [ChatTTS_Speaker](https://github.com/6drf21e/ChatTTS_Speaker) / https://modelscope.cn/studios/ttwwwaa/ChatTTS_Speaker

## 使用

ChatTTS 生成的语音随机性很强，建议使用 [ChatTTS_Speaker](https://github.com/6drf21e/ChatTTS_Speaker) 选择合适的种子，然后安装下面的方式推理。

```py
import ChatTTS
import torch
import torchaudio

chat = ChatTTS.Chat()
chat.load(compile=False) # Set to True for better performance

spk = torch.load("asset/seed_1332_restored_emb.pt", map_location=torch.device('cpu')).detach()
spk_emb_str = compress_and_encode(spk)
params_infer_code = ChatTTS.Chat.InferCodeParams(
    spk_emb= spk_emb_str,  # add sampled speaker
    temperature=.0003,  # using custom temperature
    top_P=0.7,  # top P decode
    top_K=20,  # top K decode
)

# use oral_(0-9), laugh_(0-2), break_(0-7) 
# to generate special token in text to synthesize.
params_refine_text = ChatTTS.Chat.RefineTextParams(
    prompt='[oral_2][laugh_0][break_6]',
)

wavs = chat.infer(
    texts,
    params_refine_text=params_refine_text,
    params_infer_code=params_infer_code,
)

text = 'What is [uv_break]your favorite english food?[laugh][lbreak]'
wavs = chat.infer(text, skip_refine_text=True, params_refine_text=params_refine_text,  params_infer_code=params_infer_code)
"""
In some versions of torchaudio, the first line works but in other versions, so does the second line.
"""
try:
    torchaudio.save("word_level_output.wav", torch.from_numpy(wavs[0]).unsqueeze(0), 24000)
except:
    torchaudio.save("word_level_output.wav", torch.from_numpy(wavs[0]), 24000)
```


## 问题

- [ERROR: Exception in ASGI application](https://github.com/gradio-app/gradio/issues/10662)