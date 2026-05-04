export type CgChapter = {
  id: string
  threshold: number
  title: string
  body: string
  image: string
}

export const CG_CHAPTERS: CgChapter[] = [
  {
    id: 'first-orange',
    threshold: 1,
    title: '第一颗橘子',
    body: '猫meme把第一颗橘子认真收好：这是送给duro的第一点心意。',
    image: '/assets/images/duro-orange.jpg',
  },
  {
    id: 'one-hundred',
    threshold: 100,
    title: '一百颗橘子',
    body: '口袋已经装不下了，猫meme开始思考：表白的时候要不要先递橘子，再递心。',
    image: '/assets/images/duro-orange.jpg',
  },
  {
    id: 'five-twenty',
    threshold: 520,
    title: '五百二十颗橘子',
    body: '520颗橘子排成一条小路，尽头是猫meme一直想见到的duro。',
    image: '/assets/images/duro-orange.jpg',
  },
  {
    id: 'thirteen-fourteen',
    threshold: 1314,
    title: '一千三百一十四颗橘子',
    body: '猫meme终于攒够了很长很长的心意：这一次，要认真说出口。',
    image: '/assets/images/duro-orange.jpg',
  },
]

export function getUnlockedCgChapters(totalOrangeCount: number) {
  return CG_CHAPTERS.filter((chapter) => totalOrangeCount >= chapter.threshold)
}

export function getNewlyUnlockedCgChapters(previousTotalOrangeCount: number, totalOrangeCount: number) {
  return CG_CHAPTERS.filter(
    (chapter) => previousTotalOrangeCount < chapter.threshold && totalOrangeCount >= chapter.threshold,
  )
}
