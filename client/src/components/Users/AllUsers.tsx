import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { TypeUser } from "../../utils/types"
import { API } from "../../api/api"
import { UserCard } from "./UserCard"
import classes from './AllUsers.module.css'
import { ImageWrapper } from "../../utils/reusableComponents/ImageWrapper"
import uniportLogo from '../../assets/images/uniport_logo.png';
import { Button } from "../../utils/reusableComponents/Button/Button"
import ReactToPrint from "react-to-print"


export const AllUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<TypeUser[]>([])
    const printableContent = useRef(null)
    useEffect(() => {
        const token = window.localStorage.getItem('token')
        if (!token) return navigate('/login')
        API.getAllUsers().then((res) => res.json())
            .then((response) => {
                console.log('response: ', response)
                setUsers((prevUsers) => prevUsers = response.data.users);
            })
    }, [])
    console.log('users: ', users)
    const logoWrapperStyles = {
        maxWidth: '150px',
        maxHeight: '150px',
        margin: '1rem auto'
    }
    const buttonStyles ={
        position: 'fixed',
        top: '2rem',
        zIndex: '1001'
    }
    return (
        <>
        <ReactToPrint 
        content={()=>printableContent.current}
                trigger={() => <Button style={buttonStyles} onClick={() => { window.print() }}>Print</Button>}
         />
        
            <div ref={printableContent} className={classes.Album}>
                <h2>Chemical Engineering UNIPORT</h2>
                <ImageWrapper style={logoWrapperStyles} imageLink={uniportLogo} imageAlt="uniport logo" />
                <h2>U2017 Class Album</h2>
                <div className={classes.Members}>
                    {users && users.map((el, id) => {
                        return (
                            <UserCard key={id} el={el} />
                        )
                    })}
                </div>
            </div>
        </>
    )
} 