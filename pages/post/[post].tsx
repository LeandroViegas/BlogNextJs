import React from 'react'
import Layout from './../../layout/layout'
import { Sidebar, PostCard2 } from './../../components'
import { Category, CategoryI, Post, PostI, User, UserI } from "../../database/models"
import DbConnect from './../../utils/dbConnect'
import { Document } from 'mongoose'
import { cache } from '../../services/cache'
import { getPageInfo } from '../../services/getPageInfo'

export async function getStaticPaths() {
    return {
        paths: [],
        fallback: true,
    }
}

export async function getStaticProps(context) {
    await DbConnect()

    const info = cache({name: "info"}, await getPageInfo())

    let post: Document<any, any> & PostI & any = null
    try {
        post = await Post.findOne({ link: context.params.post, publishDate: { $lte: new Date() } }).select(`-_id`).collation({ locale: "en", strength: 1 }).exec()
        let category: Document<any, any> & CategoryI = await Category.findById(post.toJSON().category).select(`-_id`).exec()
        post = { ...post.toJSON(), publishDate: post.toJSON().publishDate.toISOString().substr(0, 10), category: { name: category.name, color: category.color } }
    } catch (e) { }


    let author: Document<any, any> & UserI = null
    try {
        author = await User.findOne({ _id: post?.author }).select(`-password -activated -_id`).exec()
        post = { ...post, author: null }
    } catch (e) { }


    let recommend = null
    try {
        let perPage = 4
        let posts = await Post.aggregate([{ $sample: { size: perPage + 1 } }, { $match: { publishDate: { $lte: new Date() } } }])
        posts = posts.filter(p => context.params.post !== p.link).filter((p, i) => i < perPage)
        recommend = posts.map(p => { return { image: p.image || null, link: p.link || null, title: p.title || null, description: p.description || null } })
    } catch (e) { }


    let categories: (CategoryI & Document<any, any>)[] = null
    try {
        categories = await Category.find({}).select(`color name -_id`).exec()
    } catch (e) { }

    return {
        props: {
            post,
            recommend,
            info,
            author: author.toJSON(),
            categories: categories.map(category => category.toJSON())
        },
        revalidate: 1
    }
}

function Blog({ post, recommend, info, author, categories }) {

    const ReturnHead = <>
        <title>{post === undefined ? "Carregando..." : `${post?.title || "Post não encontrado"} - ${info?.websiteName}`} </title>
        <meta name="description" content={post?.description?.toString()} />
        <meta name="author" content={author?.username?.toString()} />
        <link rel="canonical" href={process.env.API_URL + "post/" + post?.link} />

        <meta property="og:description" content={post?.description?.toString()} />
        <meta property="og:url" content={process.env.API_URL + "post/" + post?.link} />
        <meta property="og:site_name" content={info?.websiteName} />
        <meta property="og:image" content={post?.image?.toString()} />
        <meta property="og:image:secure_url" content={post?.image?.toString()} />
        <meta property="og:title" content={`${post?.title} - ${info?.websiteName}`} />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:type" content="article" />

        <meta property="article:published_time" content={(new Date(post?.publishDate))?.toString()} />
        <meta property="article:modified_time" content={(new Date(post?.publishDate))?.toString()} />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:description" content={post?.description?.toString()} />
        <meta name="twitter:image" content={post?.image?.toString()} />
        <meta name="twitter:title" content={`${post?.title} - ${info?.websiteName}`} />
        <meta name="twitter:site" content="@" />
        <meta name="twitter:creator" content="@" />
    </>

    return (
        <>
            <Layout head={ReturnHead} info={info} categories={categories}>
                <div className="col-span-3 w-full mx-auto relative" style={{ height: "24em" }}>
                    <div className="absolute left-0 bottom-0 w-full h-full z-10"
                        style={{ backgroundImage: "linear-gradient(180deg,transparent,rgba(0,0,0,.7))" }}></div>
                    {post === undefined ?
                        <></> :
                        post === null ?
                            (<></>) : (<img src={post?.image} alt="banner" className="absolute left-0 top-0 w-full h-full z-0 object-cover" />)
                    }

                    <h2 className="p-16 text-center text-2xl font-semibold text-gray-700">Post não encontrado.</h2>

                    <div className="p-4 h-full container mx-auto">
                        {
                            (post === null) ?
                                ("") :
                                (
                                    <div className="bottom-0 absolute z-20 p-4">
                                        <a href={"/category/" + post?.category?.name}
                                            style={{ backgroundColor: post?.category?.color }} className="px-4 py-1 bg-black text-gray-200 inline-flex items-center justify-center mb-2">{post?.category?.name}</a>
                                        <h1 className="md:text-4xl font-semibold text-gray-100 text-2xl leading-tight">
                                            {post?.title}
                                        </h1>

                                        <div className="flex items-center mt-3">
                                            <div>
                                                <img src={author?.image}
                                                    className="h-10 w-10 rounded-full mr-2 object-cover" />
                                            </div>
                                            <div className="grid grid-cols-3">
                                                <div className="col-span-2">
                                                    <div className="text-gray-300 font-semibold">
                                                        <div className="inline-block px-1">
                                                            Autor: <a className="font-normal">{author?.username}</a>,
                                                        </div>
                                                        <div className="inline-block px-1">
                                                            Discord: <a className="font-normal">{author?.discordUser}</a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-span-1">
                                                    <div className="text-sm text-gray-300 font-semibold text-right">
                                                        <div className="inline-block px-1">Publicado em:</div>
                                                        <div className="inline-block px-1 font-normal">{post?.publishDate}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )

                        }
                    </div>
                </div>
                <div className="container mx-auto grid grid-cols-3">
                    <div className="col-span-3 md:col-span-2">
                        <div className="lg:px-16 md:mx-6 mt-2 py-4 rounded-md" >
                            {
                                (post === null) ?
                                    (<h3 className="p-16 text-center text-xl">Página sem conteúdo.</h3>) :
                                    (<div className="post sun-editor-editable" dangerouslySetInnerHTML={{ __html: post?.content }}></div>)
                            }
                        </div>

                    </div>
                    <div className="col-span-3 mx-4 md:col-span-1 md:mx-0">
                        <Sidebar categories={categories} />
                    </div>
                </div>
                <div className="container mx-auto grid grid-cols-4">
                    <div className="px-4 mt-4 col-span-4">
                        <p className="text-4xl px-2 text-semibold text-gray-700">Recomendados:</p>
                        <hr className="my-2" />
                    </div>
                    {recommend?.map((post, index) => {
                        return (
                            <PostCard2 key={index} info={info} description={post?.description} image={post?.image} link={post?.link} title={post?.title} />
                        )
                    })}
                </div>
            </Layout>
        </>)
}




export default Blog