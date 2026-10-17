import re,sys
src,dst=sys.argv[1],sys.argv[2]
h=open(src).read()
head=h[h.index('<head>')+6:h.index('</head>')]
title=re.search(r'<title>.*?</title>',head).group(0)
meta=re.search(r'<meta name="claude:viewport-fit-sides"[^>]*>',head).group(0)
links=''.join(re.findall(r'<link[^>]*>',head))
styles=''.join(re.findall(r'<style[^>]*>.*?</style>',head,re.S))
scripts=''.join(re.findall(r'<script[^>]*>.*?</script>',head,re.S))
body=h[h.index('<body>')+6:h.index('</body>')]
out=f"{title}\n{meta}\n{links}\n{styles}\n{body.strip()}\n{scripts}\n"
open(dst,'w').write(out)
print(len(out)); print(out[:500])
