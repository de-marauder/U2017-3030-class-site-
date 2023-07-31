
import { useEffect, useState } from 'react';
import randomatic from 'randomatic'
import '../../App.css'
import { useNavigate } from 'react-router-dom';
import { GetUserAPIResponse, TypeUser, TypeUserWithId, UserFormData } from '../../utils/types';
import { API } from '../../api/api';
import { ErrorMessageModal } from '../../utils/reusableComponents/ErrorMessgeModal';
import { Input } from '../../utils/reusableComponents/Input/Input';
import { buildPayload, checkCanSubmit, setFormDataHelper, storeTokenAndUser } from '../../utils/functions';
import { ImageWrapper } from '../../utils/reusableComponents/ImageWrapper';
import portrait from '../../assets/images/Portrait_Placeholder.png'
import { defaultUpdateUserMessage } from '../../utils/vars';
import { Modal } from '../../utils/reusableComponents/Modal/Modal';
import { Form } from '../../utils/reusableComponents/Form/Form';
import { Button } from '../../utils/reusableComponents/Button/Button';
import classes from './UserDetails.module.css'

type SecureUrlType = string | undefined


export const UserDetails = () => {
    const navigate = useNavigate()
    const [popUpMessage, setPopUpMessage] = useState<string>('')
    const [errorMessage, setErrorMessage] = useState<string>('')
    const [formError, setFormError] = useState<UserFormData>({
        first_name: '',
        last_name: '',
        other_name: '',
        state: '',
        lga: '',
        dob: '',
        phone: '',
        email: '',
        matriculation_number: '',
        img: '',
        file: ''
    })
    const [user, setUser] = useState<Required<Omit<TypeUserWithId, 'password'>>>({
        _id: '',
        firstName: '',
        lastName: '',
        otherName: '',
        state: '',
        lga: '',
        dob: '',
        phone: '',
        email: '',
        matNo: '',
        img: ''
    })
    const [file, setFile] = useState<File | null>()
    const [formData, setFormData] = useState<UserFormData>({
        first_name: '',
        last_name: '',
        other_name: '',
        state: '',
        lga: '',
        dob: '',
        phone: '',
        email: '',
        matriculation_number: '',
        file: ''
    })
    const [canSubmit, setCanSubmit] = useState<boolean>(true)

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        try {
            setErrorMessage('')
            setPopUpMessage('Sending...')

            if (user) {
                e.preventDefault();
                console.log('Event: ', e)
                let url: SecureUrlType

                // Get secure url from server
                if (file) {
                    const objectName = formData.matNo as string + `-${randomatic('0', 4)}`
                    url = (await API.getS3SecureUrl({ objectName, key: 'photos' }).then((res) => res.json() as Promise<{ url: SecureUrlType }>)).url;
                    if (!url) throw new Error('Url undefined');
                    // Post image to s3
                    await API.sendObjectToS3(url, file)
                }

                // send link and other data to server
                const imgUrl = url?.split('?')[0]
                const payload = buildPayload(formData as Required<typeof formData>) as Required<TypeUser>
                if (imgUrl) payload.img = imgUrl
                const response = await API.updateUser(user?._id, payload)
                    .then(res => {
                        setPopUpMessage('')
                        const r = res.json() as Promise<GetUserAPIResponse>;
                        if (!res.ok) setErrorMessage(defaultUpdateUserMessage)
                        return r
                    })
                    .catch((err) => {
                        console.log('Fetch error', err.message)
                        setErrorMessage(err.message || 'Fetch error')
                    })
                if (!response) throw new Error('Bad response')
                if (response.status === 'failed') {
                    setErrorMessage(response.message || defaultUpdateUserMessage); return
                }

                setPopUpMessage('Update done')
                setTimeout(() => { setPopUpMessage('') }, 3000)
                setFormData((prevData) => {
                    return setFormDataHelper(response, prevData)
                });
                imgUrl && setUser((prevData) => {
                    const tkn = window.localStorage.getItem('token')
                    if (tkn) storeTokenAndUser(response?.data?.user, tkn)

                    return {
                        ...prevData,
                        img: response?.data?.user.img
                    }
                })
            }
        } catch (error) {
            setErrorMessage((error as Error).message || 'Something bad happened')
        }
    }
    console.log('formData: ', formData)
    console.log('formError: ', formError)
    console.log('user: ', user)
    useEffect(() => {
        const tkn = window.localStorage.getItem('token')
        const user = JSON.parse(window.localStorage.getItem('user') as string) as Required<TypeUserWithId> | null | undefined | ''
        if (!tkn || !user) return navigate('/login')
        const getUserApiTimeout = setTimeout(() => {

            API.getUser(user._id).then((res) => {
                if (res.ok === false) { setErrorMessage('Error getting user data'); return }
                return res.json()
            }).then((response: GetUserAPIResponse) => {
                console.log('response: ', response)
                if (!response) { setErrorMessage('Could not retrieve user data'); return }
                setUser(() => response.data?.user);
                storeTokenAndUser(user, tkn)
                setFormData((prevData) => {
                    return setFormDataHelper(response, prevData)
                })
            }).catch((e: Error) => {
                console.log(e)
                setErrorMessage(e.message);
            });
        }, 0)
        return () => clearTimeout(getUserApiTimeout)
    }, [navigate]);

    const profilePictureStyles = {
        borderRadius: '50%',
        overflow: 'hidden',
        width: '200px',
        height: '200px',
        backgroundColor: 'var(--dark-color)'
    }
    const flexWrap = 'wrap'
    const inputsWrapperStyles = {
        margin: '2rem 1rem',
        display: 'flex',
        flexWrap: flexWrap as 'wrap'
    }
    const flexDirection = 'column'
    const inputWrapperStyles = {
        display: 'flex',
        flexDirection,
    }
    const inputComponentWrapperStyles = {
        flex: '0 0 50%',
        width: '45%',
    }

    const formInputs = ((() => {
        delete formData.file;
        return Object.entries(formData).map(([key, value], id) => {
            let disabled: boolean = false
            let type: string = ''
            if (key === 'matriculation_number') disabled = true
            if (key === 'email') type = 'email'
            if (key === 'dob') type = 'date'
            if (key === 'phone') type = 'tel'
            return (
                <div key={id} className={classes.FormInputs} style={inputComponentWrapperStyles}>
                    <Input k={key}
                        inputWrapperStyles={inputWrapperStyles}
                        value={value}
                        checkCanSubmit={() => checkCanSubmit({ formData, setCanSubmit, setErrorMessage: setFormError }, { isUserDetails: true })}
                        setFormData={setFormData}
                        errorMessage={formError}
                        disabled={disabled}
                        type={type}
                    />
                </div>
            )
        })
    })());

    const profilePicture = (
        <div style={{ margin: '1rem auto', width: 'fit-content', position: 'relative' }}>
            <ImageWrapper style={profilePictureStyles} imageLink={user?.img ? user?.img : portrait} imageAlt='profile picture' />
            <div className={classes.ProfilePicture} style={{ marginTop: '-5%', position: 'absolute', left: '110%', top: '50%' }} >
                <p style={{ textAlign: 'left' }}>Update Profile Picture</p>
                <input required value={formData.file} type="file" onChange={(e) => {
                    const files = (e.target as HTMLInputElement).files
                    if (files) {
                        const file = files[0]
                        if (file.size > 50 * 1000 * 1000) return setFormError((prevState) => { return { ...prevState, file: 'File is too large' } })
                        setFile(files && files[0])
                        const reader = new FileReader();

                        // Set up the event handler for when the file is loaded
                        reader.onload = function (event) {
                            setUser({ ...user, img: event.target?.result?.toString() ? event.target.result.toString() : '' })
                        };

                        // Read the file as a data URL
                        reader.readAsDataURL(file);
                        setFormData({ ...formData, file: files[0].name })
                    }
                }} />
            </div>
        </div>
    )

    return (
        <>
            <h1>Profile details</h1>
            <br />
            <section>
                {popUpMessage && (
                    <Modal onClick={() => setPopUpMessage('')}>
                        <p>{popUpMessage}</p>
                    </Modal>)
                }
                {errorMessage && <ErrorMessageModal onClick={()=>setErrorMessage('')} errorMessage={errorMessage} />}
                <Form >
                    {user && (
                        <div >
                            {profilePicture}
                            <div style={inputsWrapperStyles}>
                                {formInputs}
                            </div>
                        </div>
                    )}

                    {canSubmit ?
                        <Button style={{ backgroundColor: 'var(--dark-color)', color: 'var(--light-color)' }} onClick={(e) => { handleSubmit(e) }}>Submit</Button>
                        : <p>Fill the form above to submit</p>
                    }
                </Form>
            </section>
        </>
    )
}

