import numpy as np, base64, io, json
from PIL import Image, ImageFilter, ImageEnhance
S='/home/claude/src/'
def L(n): return Image.open(S+n+'.png').convert('RGB')
def tileable(im, axis='both'):
    a=np.asarray(im).astype(np.float32); h,w,_=a.shape
    out=a.copy()
    if axis in('both','x'):
        r=np.roll(a,w//2,axis=1); m=np.abs(np.linspace(-1,1,w))[None,:,None]
        out=out*(1-m)+r*m
    if axis in('both','y'):
        r=np.roll(out,h//2,axis=0); m=np.abs(np.linspace(-1,1,h))[:,None,None]
        out=out*(1-m)+r*m
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8))
def mask(im, fn, grow=0, blur=0.6):
    a=np.asarray(im).astype(np.float32); r,g,b=a[...,0],a[...,1],a[...,2]
    m=fn(r,g,b).astype(np.float32)*255
    mi=Image.fromarray(m.astype(np.uint8))
    mi=mi.filter(ImageFilter.MedianFilter(3))
    if grow: mi=mi.filter(ImageFilter.MaxFilter(grow))
    o=im.copy(); o.putalpha(mi); return o
OUT={}
def save(name, im, size, fmt='JPEG', q=78):
    im=im.resize(size, Image.LANCZOS)
    b=io.BytesIO()
    if fmt=='JPEG': im.convert('RGB').save(b,'JPEG',quality=q)
    else: im.save(b,'PNG',optimize=True)
    im.save('/home/claude/tex/'+name+('.jpg' if fmt=='JPEG' else '.png'))
    OUT[name]='data:image/'+('jpeg' if fmt=='JPEG' else 'png')+';base64,'+base64.b64encode(b.getvalue()).decode()
    print(name, size, len(b.getvalue()))
C=lambda n,box: L(n).crop(box)

# --- room
save('wall', tileable(C('IMG_7138',(650,40,1000,260))), (128,96))
save('tile', tileable(C('IMG_7141',(20,30,230,240))), (96,96))
save('rug', C('IMG_7141',(110,420,390,780)).rotate(90,expand=True), (192,150))
save('rugDark', tileable(C('IMG_7141',(415,410,555,590))), (64,64))
save('curtain', tileable(C('IMG_7138',(200,0,310,250)),'x'), (64,160))
save('screen', C('IMG_7145',(905,430,1165,615)), (160,112))
save('couch', tileable(C('IMG_7138',(900,600,1080,700))), (64,48))
save('door', C('IMG_7139',(190,25,605,745)), (128,224))
save('intercom', C('IMG_7139',(585,340,678,415)), (48,40))
save('shade', C('IMG_7139',(1000,268,1155,378)), (96,64))
save('shoes', C('IMG_7139',(685,555,945,790)), (128,112))
save('shirt', C('IMG_7138',(495,395,632,650)), (64,112))
save('vase', C('IMG_7164',(235,640,305,760)), (32,56))
save('croc', C('IMG_7141',(240,5,370,100)), (64,48))
save('desk', C('IMG_7141',(300,810,700,1000)).rotate(180), (192,96))
nonwall=lambda r,g,b: ~((r+g+b>430) & (np.maximum(np.maximum(r,g),b)-np.minimum(np.minimum(r,g),b)<55))
bg=C('IMG_7139',(690,130,905,535)); wc=np.asarray(bg).astype(np.float32)[5:30,5:30].reshape(-1,3).mean(0)
save('bags', mask(bg, lambda r,g,b: np.sqrt((r-wc[0])**2+(g-wc[1])**2+(b-wc[2])**2)>55, grow=3), (96,184), 'PNG')
green=lambda r,g,b: (g>=r-10)&(g-b>16)&(g>38)
save('palm', mask(C('IMG_7150',(0,0,900,840)), green, grow=5), (256,240), 'PNG')
save('bamboo', mask(C('IMG_7148',(140,100,700,1150)), lambda r,g,b:(g>=r-12)&(g-b>20)&(g>38), grow=5), (160,300), 'PNG')
save('clusia', mask(C('IMG_7145',(675,415,855,650)), lambda r,g,b:(g>=r-4)&(g-b>8)&(g<200), grow=3), (80,104), 'PNG')
save('flowers', mask(C('IMG_7164',(190,545,370,645)), lambda r,g,b: nonwall(r,g,b)&(r+g+b<560), grow=3), (96,56), 'PNG')
guit=lambda r,g,b: (r+g+b<170)
save('guitar', mask(C('IMG_7148',(555,170,805,1010)), guit, grow=3), (96,320), 'PNG')
# --- avatar
def clean_swoosh(im):
    a=np.asarray(im).astype(np.float32); l=a.mean(-1)
    dark=np.median(a[l<60],axis=0)
    sel=l>95
    noise=np.random.RandomState(1).normal(0,6,a.shape)
    a[sel]=dark+noise[sel]
    return Image.fromarray(np.clip(a,0,255).astype(np.uint8))
def darken_edges(im, frac=.28, thr=120, all_cols=False):
    a=np.asarray(im).astype(np.float32); h,w,_=a.shape; l=a.mean(-1)
    dark=np.median(a[l<60],axis=0); cols=np.zeros(w,bool)
    if all_cols: cols[:]=True
    else: cols[:int(w*frac)]=True; cols[w-int(w*frac):]=True
    sel=(l>thr)&cols[None,:]
    noise=np.random.RandomState(2).normal(0,5,a.shape); a[sel]=dark+noise[sel]
    return Image.fromarray(np.clip(a,0,255).astype(np.uint8))
save('torsoF', darken_edges(C('IMG_7164',(362,392,628,658))), (96,96))
save('torsoB', darken_edges(C('IMG_7217',(345,350,603,662)),.5), (96,112))
save('sleeve', darken_edges(C('IMG_7164',(366,430,394,670)),all_cols=True,thr=90), (16,96))
save('shortsF', clean_swoosh(C('IMG_7164',(372,652,602,845))), (96,80))
save('shortsB', clean_swoosh(C('IMG_7217',(390,668,600,850))), (96,80))
save('leg', C('IMG_7164',(430,860,530,1100)), (32,80))
save('hair', tileable(C('IMG_7224',(250,260,540,560))), (64,64))
# head unwrap 512x256
W,H=512,256
head=np.zeros((H,W,3),np.float32); wsum=np.zeros((H,W,1),np.float32)
def put(img, u0, u1, feather=14):
    x0,x1=int(u0*W),int(u1*W); w=x1-x0
    a=np.asarray(img.resize((w,H),Image.LANCZOS)).astype(np.float32)
    m=np.ones((1,w,1),np.float32); f=min(feather,w//3)
    m[0,:f,0]=np.linspace(0.05,1,f); m[0,w-f:,0]=np.linspace(1,0.05,f)
    for i in range(w):
        xx=(x0+i)%W; head[:,xx]+=a[:,i]*m[0,i]; wsum[:,xx]+=m[0,i]
put(C('IMG_7221',(212,170,592,700)), .26, .74)
put(C('IMG_7222',(470,170,670,700)), .70, .93)
put(C('IMG_7223',(175,170,380,700)), .07, .30)
hb=C('IMG_7224',(240,240,560,640))
put(hb, .87, 1.13)
hi=Image.fromarray(np.clip(head/np.maximum(wsum,1e-3),0,255).astype(np.uint8))
hi=ImageEnhance.Brightness(hi).enhance(1.12)
save('head', hi, (256,128))
import pillow_heif; pillow_heif.register_heif_opener()
from PIL import ImageOps
full=ImageOps.exif_transpose(Image.open('/mnt/user-data/uploads/IMG_7145.HEIC')).convert('RGB'); k=full.width/1200
wp=full.crop(tuple(int(v*k) for v in (905,428,1168,616)))
save('wallpaper', ImageEnhance.Contrast(wp).enhance(1.05), (640,458), q=70)
json.dump(OUT, open('/home/claude/tex/tex.json','w'))
print('total', sum(len(v) for v in OUT.values()))
