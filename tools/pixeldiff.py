import sys,os
from PIL import Image,ImageChops
a,b=sys.argv[1],sys.argv[2];bad=0;tot=0
for f in sorted(os.listdir(a)):
    tot+=1
    if not os.path.exists(f'{b}/{f}'):print('MISSING',f);bad+=1;continue
    x,y=Image.open(f'{a}/{f}').convert('RGB'),Image.open(f'{b}/{f}').convert('RGB')
    if x.size!=y.size:print('SIZE',f,x.size,y.size);bad+=1;continue
    bb=ImageChops.difference(x,y).getbbox()
    if bb:
        n=sum(1 for p in ImageChops.difference(x,y).convert('L').getdata() if p>8)
        print('DIFF',f,bb,n);bad+=1
print(f'{tot-bad}/{tot} identical')
