"""Fetch selected catalogue references for local review; does not admit them to training."""
import concurrent.futures, hashlib, json, pathlib, sys, urllib.request
root=pathlib.Path('data/research/neon-source-intake')
manifest=json.loads((root/'manifest.json').read_text())
ids=set(sys.argv[1:])
rows=[r for r in manifest['records'] if not ids or r['id'] in ids]
def fetch(row):
    result={'id':row['id'],'source_url':row['source_url'],'image_url':row['image_url'],'rights_as_stored':row['rights'],'training_admitted':False}
    dest=root/'images'/row['id']/'source.image'
    try:
        if dest.exists(): data=dest.read_bytes();result['cached']=True
        else:
            request=urllib.request.Request(row['image_url'],headers={'User-Agent':'ASCEND-reference-study/1.0'})
            with urllib.request.urlopen(request,timeout=12) as response:
                data=response.read(8*1024*1024+1)
                if len(data)>8*1024*1024: raise ValueError('image exceeds 8 MiB')
                if not response.headers.get('Content-Type','').startswith('image/'): raise ValueError('not an image response')
            dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
        result.update(status='downloaded',bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),path=str(dest))
    except Exception as error: result.update(status='failed',error=str(error))
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results=list(pool.map(fetch,rows))
report={'schema':'ascend.neon-source-fetch.v1','selected':len(rows),'downloaded':sum(r['status']=='downloaded' for r in results),'results':results,'model_training_performed':False}
(root/'fetch-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'selected':len(rows),'downloaded':report['downloaded'],'results':[{'id':r['id'],'status':r['status'],'error':r.get('error')} for r in results]},ensure_ascii=False))
