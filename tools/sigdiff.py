import sys,os,json
a,b=sys.argv[1],sys.argv[2];bad=0;tot=0;ex={}
def norm(e):
    i,k,h=e.split('|',2);return (k.split('.')[0],h)
for f in sorted(os.listdir(a)):
    tot+=1
    x=json.load(open(f'{a}/{f}'));y=json.load(open(f'{b}/{f}'))
    if len(x)!=len(y):print('LEN',f);bad+=1;continue
    d=[i for i in range(len(x)) if norm(x[i])!=norm(y[i])]
    if d:
        bad+=1
        for i in d: ex[y[i].rsplit('|',1)[0]]=ex.get(y[i].rsplit('|',1)[0],0)+1
        print('DIFF',f,len(d))
print(f'{tot-bad}/{tot} identical');print(sorted(ex.items(),key=lambda t:-t[1])[:25])
