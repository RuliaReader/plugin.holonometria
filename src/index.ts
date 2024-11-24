/* @__PURE__ */

import $ from 'jquery'

const COVER: Record<string, string> = {
  ウェスタdeクッキング: 'https://alt.hololive.tv/wp-content/uploads/2024/11/%E3%82%AF%E3%83%83%E3%82%AD%E3%83%B3%E3%82%AF%E3%82%99.jpg',
  'Vesta de Cooking': 'https://alt.hololive.tv/wp-content/uploads/2024/11/%E3%82%AF%E3%83%83%E3%82%AD%E3%83%B3%E3%82%AF%E3%82%99.jpg',

  'それゆけ!! 魔界学校': 'https://alt.hololive.tv/wp-content/uploads/2023/06/cover_makaigakko.jpg',
  'Underworld Academy Overload!!': 'https://alt.hololive.tv/wp-content/uploads/2023/06/cover_makaigakko.jpg',
  'Sukaria Sekolah Alam Bawah': 'https://alt.hololive.tv/wp-content/uploads/2023/06/cover_makaigakko.jpg',

  'Yamato Phantasia': 'https://alt.hololive.tv/wp-content/uploads/2023/06/holoearth_main-1.png',
  ヤマト神想怪異譚: 'https://alt.hololive.tv/wp-content/uploads/2023/06/holoearth_main-1.png',
  'Kisah Fantasi Yamato': 'https://alt.hololive.tv/wp-content/uploads/2023/06/holoearth_main-1.png'
}

function sleep (ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get manga list for manga list page.
 * This function will be invoked by Rulia in the manga list page.
 *
 * @param {string} page Page number. Please notice this arg will be passed from Rulia in string type.
 * @param {string} pageSize Page size. Please notice this arg will be passed from Rulia in string type.
 * @param {string} keyword The search keyword. It will empty when user doesn't provide it.
 * @param {string} rawFilterOptions The filter options.
 * @returns
 */
async function getMangaList (
  page: string,
  pageSize: string,
  keyword?: string,
  rawFilterOptions?: string
) {
  if (page !== '1') {
    window.Rulia.endWithResult({
      list: []
    })
    return
  }

  try {
    const config = window.Rulia.getUserConfig()
    const lang = (config?.language ?? 'en').toLowerCase()

    const homepages: Record<string, string> = {
      en: 'https://alt.hololive.tv/holonometria/en/',
      jp: 'https://alt.hololive.tv/holonometria/',
      id: 'https://alt.hololive.tv/holonometria/id/'
    }

    const homepage = homepages[lang] || homepages.en
    const response = await window.Rulia.httpRequest({
      url: homepage,
      method: 'GET'
    })

    const result: IGetMangaListResult = {
      list: []
    }

    $(response).find('li[data-type="manga"] a').each((i, el) => {
      const title = $(el).text()
      const url = $(el).attr('href') ?? ''
      result.list.push({
        title,
        url,
        coverUrl: COVER[title] ?? ''
      })
    })

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

async function getChapterListFromDetailPage (detailPage: string): Promise<{ title: string, url: string }[]> {
  const response = await window.Rulia.httpRequest({
    url: detailPage,
    method: 'GET'
  })

  const result: { title: string, url: string }[] = []
  $(response).find('article.md-list__archive--lineup--block').each((i, el) => {
    const $a = $(el).find('a')
    const $h4 = $(el).find('h4')
    const title = $h4.text().trim()
    const url = $a.attr('href') ?? ''
    result.push({
      title,
      url
    })
  })

  return result
}

/**
 * Get data of a single manga.
 * This function will be invoked by Rulia when user clicks a certain manga
 * in the manga list page.
 *
 * @param {string} dataPageUrl This url is from the function "getMangaList".
 * @returns
 */
async function getMangaData (dataPageUrl: string) {
  try {
    const response = await window.Rulia.httpRequest({
      url: dataPageUrl,
      method: 'GET'
    })

    const $html = $(response)
    const title = $html.find('h1.md-ttl__pages')?.text()?.trim() ?? ''
    const description = $html.find('main.mangainfo--main main')?.text()?.trim() ?? ''
    const coverUrl = $html.find('main.mangainfo--main img')?.attr('src') ?? ''

    const result: IGetMangaDataResult = {
      title,
      description,
      coverUrl,
      chapterList: []
    }

    const allDetailPages = [dataPageUrl]
    $html.find('.pagenation-list a').each((i, el) => {
      const url = $(el).attr('href')
      if (url) {
        allDetailPages.push(url)
      }
    })

    for (const pageUrl of allDetailPages) {
      const list = await getChapterListFromDetailPage(pageUrl)
      result.chapterList.push(...list)
      await sleep(300)
    }

    result.chapterList.reverse()
    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

/**
 * Get image urls of all images from a single episode.
 *
 * @param {string} chapterUrl This url is from the result of the function 'getMangaData'.
 */
async function getChapterImageList (chapterUrl: string) {
  try {
    const response = await window.Rulia.httpRequest({
      url: chapterUrl,
      method: 'GET'
    })

    const result: IRuliaChapterImage[] = []
    const $html = $(response)

    const $mangaBlocks = $html.find('.manga--viewer__block')
    $mangaBlocks.each((i, el) => {
      const img = $(el).find('img')[0]
      if (img) {
        result.push({
          url: img.src,
          width: 684,
          height: 997
        })
      }
    })

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

/**
 * This function will be invoked when Rulia is going to download a image.
 *
 * Since some websites require special verification before downloading images,
 * you may need to implement these verification logics within this method.
 * If the target website doesn't need special logic, you can just directly
 * return the parameter 'url'.
 *
 * @param {string} path This url is from the result of the function 'getChapterImageList'
 */
async function getImageUrl (path: string) {
  window.Rulia.endWithResult(path)
}
