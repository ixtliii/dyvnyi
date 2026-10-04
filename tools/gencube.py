import json, io, base64
from PIL import Image, ImageEnhance
S='/home/claude/src/'
def C(n,b): return Image.open(S+n+'.png').convert('RGB').crop(b)
OUT={}
def save(name, im, size, q=82):
    im=ImageEnhance.Brightness(im.resize(size, Image.LANCZOS)).enhance(1.1)
    b=io.BytesIO(); im.save(b,'JPEG',quality=q); im.save('/home/claude/tex/'+name+'.jpg')
    OUT[name]='data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode(); print(name,len(b.getvalue()))
save('cubeF', C('IMG_7221',(250,200,570,700)), (200,252))
save('cubeL', C('IMG_7222',(290,215,640,700)), (200,252))   # his left side (+x)
save('cubeR', C('IMG_7223',(190,215,540,700)), (200,252))   # his right side (-x)
save('cubeB', C('IMG_7224',(270,330,560,640)), (200,252))
save('cubeT', C('IMG_7224',(280,330,550,560)), (200,200))
save('portrait', C('IMG_7221',(150,200,650,720)), (96,100))
t=json.load(open('/home/claude/tex/tex.json')); t.update(OUT); json.dump(t,open('/home/claude/tex/tex.json','w'))
