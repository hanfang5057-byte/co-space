/** Lead out below the highlighted text, then turn in the gutter towards the card. */
export function annotationConnector(anchor, cardLeft, cardTop, cardHeight, paperRight) {
  const x1=anchor.right;
  const y1=anchor.bottom-1;
  const x2=cardLeft;
  const y2=cardTop+Math.min(24,Math.max(12,cardHeight/2));
  const width=x2-x1;
  if(width<=36) {
    const reach=Math.max(0,width*.45);
    return {x1,y1,x2,y2,d:`M ${x1} ${y1} C ${x1+reach} ${y1}, ${x2-reach} ${y2}, ${x2} ${y2}`};
  }
  const startX=x1+14, under=y1+8;
  const turn=Math.max(startX,Math.min(paperRight-8,x2-18));
  const reach=(x2-turn)*.5;
  const d=`M ${x1} ${y1} C ${x1+5} ${y1}, ${x1+6} ${under}, ${startX} ${under} L ${turn} ${under} C ${turn+reach} ${under}, ${x2-reach} ${y2}, ${x2} ${y2}`;
  return {x1,y1,x2,y2,d};
}
